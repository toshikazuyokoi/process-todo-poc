# AIエージェント: 会話出力からPROCESS TODOテンプレート登録までの接続設計（v1.2）

最終更新: 2025-09-09

## 目的
AIエージェントのチャット応答（ai_chat_process_template.v1 を含む）を起点に、
- 会話中の構造化JSONを「セッションのテンプレート下書き（Draft）」として保存し、
- ユーザーの操作で「確定（Finalize）」した際に、既存のPROCESS TODOテンプレートとして登録する、
までをエンドツーエンドで接続する。既存実装を破壊せず、最小変更で段階導入可能にする。

## 関連（Issue）
- GitHub Issue #54: 「OpenAI接続のダミー実装解消（v1.1）」
  - 本IssueはOpenAI接続と最小のプロンプト/パーサ/フォールバック/監査をスコープ。
  - 本ドキュメントは、その先の「テンプレート取り込み」接続の設計（v1.2）。

## 現状サマリー（確認結果）
- チャット→OpenAI応答→LLMOutputParserで厳密検証→会話保存→要件抽出ジョブ投入 までは到達。
- ただし、
  - 構造化JSON（ai_chat_process_template.v1）をセッションの Draft として保持していない。
  - finalize（確定）時に ProcessTemplateRepository へ保存していない（履歴保存止まり）。
- 既存の関連導線・部品：
  - GenerateTemplateRecommendationsUseCase（推奨案）、
  - FinalizeTemplateCreationUseCase（検証・並び最適化・履歴保存）、
  - CreateProcessTemplateUseCase / ProcessTemplateRepository（既存テンプレ作成API）。

## 目標アーキテクチャ（概要）
1. 会話処理（/messages）で構造化JSONのパースに成功したら、セッションへ Draft を保存。
2. ユーザーが finalize を呼ぶと、Draft（または推奨案）を CreateProcessTemplateUseCase 経由で正式テンプレート登録。
3. 履歴（TemplateGenerationHistory）と既存テンプレートIDを相互に関連付け、セッションを完了。

## 既存構造への影響方針
- エンドポイントの追加は不要。既存の
  - POST /api/ai-agent/sessions/:id/messages
  - POST /api/ai-agent/sessions/:id/generate-template
  - POST /api/ai-agent/sessions/:id/finalize-template
  を拡張する。
- 後方互換を維持（レスポンス構造は最小限のフィールド追加で対応）。
- フィーチャーフラグで段階的に有効化可能。

---

## 詳細設計

### 1) TemplateDraftMapper（実装追加）
目的:
- ai_chat_process_template.v1 → セッションの Draft（InterviewSession.GeneratedTemplate）へ変換。
- Draft / ai_chat → CreateProcessTemplateDto（正式テンプレ登録用）へ変換。

想定API:
- `toSessionDraft(aiChat: AiChatProcessTemplateJson): GeneratedTemplate`
- `toCreateDtoFromAiChat(aiChat: AiChatProcessTemplateJson): CreateProcessTemplateDto`
- `toCreateDtoFromDraft(draft: GeneratedTemplate): CreateProcessTemplateDto`

変換ルール（要点）:
- name:
  - ai_chat.process_template_draft.name があれば採用、無ければ `AI Draft (yyyy-MM-dd HH:mm)` 等。
- steps:
  - ai_chat.stepTemplates[{ seq, name, basis, offsetDays, dependsOn? }]
  - Draft（セッション用）: `{ name, description?, duration, dependencies[] }`
    - duration := offsetDays（暫定。相対日数として扱う）
    - dependencies := dependsOn（seqの配列）
- 正式テンプレDTO（CreateProcessTemplateDto）:
  - stepTemplates[{ seq, name, basis, offsetDays, requiredArtifacts?, dependsOn? }]
  - basis は seq=1 → 'goal'、以降 'prev' を基本（ai_chat値はLLMOutputParserで検証済）。
  - offsetDays は Draft.duration をそのまま採用（負値等の細則は別途ポリシーで調整可）。

バリデーション:
- seq連番/dependsOnは LLMOutputParser が保証。Mapperは変換専念。
- 値の欠落は既定値で補完し、警告ログのみ（後続でユーザー編集/再生成可能にする）。


### 2) 会話時のDraft保存（ProcessUserMessageUseCase 拡張）
トリガ:
- OpenAI応答の content に含まれる最後の ```json フェンスの ai_chat_process_template.v1 をパース成功した場合。

処理:
- `TemplateDraftMapper.toSessionDraft(parsed.data)`
- `InterviewSessionRepository.updateGeneratedTemplate(sessionId, draft)`
- WebSocket通知（既存の `notifyTemplateGenerated(sessionId, draft)` を流用、または `notifyDraftUpdated` を新設）
- 監視ログ: `ai_draft_saved`

互換性:
- APIレスポンスは現状どおり（本文＋フェンスJSON）。裏でDraftのみ更新。


### 3) 確定時の正式テンプレ登録（FinalizeTemplateCreationUseCase 拡張）
依存注入:
- `CreateProcessTemplateUseCase`
- `TemplateDraftMapper`

処理フロー:
1. セッション取得、`getGeneratedTemplate()` で Draft を解決（または推奨案の同等構造）。
2. 既存の検証・並び最適化は従来通り（TemplateRecommendationService）。
3. DTO変換:
   - `mapper.toCreateDtoFromDraft(finalTemplate)`
4. 正式テンプレ登録:
   - `createProcessTemplateUseCase.execute(dto)`
   - 競合（name重複）は `ConflictException`。UIでのリネーム誘導またはポリシーで自動サフィックスを検討（本設計では例外を返す）。
5. 履歴更新/セッション完了:
   - `TemplateGenerationHistoryRepository.markAsUsed(historyId, processTemplateId, modifications?)`
   - `InterviewSessionRepository.markAsCompleted(sessionId)`
6. レスポンス拡張（互換維持）:
   - `processTemplateId` を追加プロパティとして返却可。


### 4) 推奨案生成（GenerateTemplateRecommendationsUseCase）との関係
- 最小構成では現状のままでも接続可能。
- 強化案（任意）: Draft を文脈に加える（例: Draftの工程を優先/固定）
  - TemplateRecommendationService へのコンテキスト拡張で対応。


### 5) 非同期ジョブ（Processor）補強案（任意）
- REQUIREMENT_ANALYSIS: 解析結果を `InterviewSessionRepository.updateRequirements` に書き戻し。
- TEMPLATE_GENERATION: Draft＋要件＋KB＋Webリサーチで案を生成し、`updateGeneratedTemplate` と通知。

---

## データモデル対応表

| 出所 | 構造 | 変換先 |
|---|---|---|
| ai_chat_process_template.v1 | `{ answer, process_template_draft: { name?, stepTemplates[{seq,name,basis,offsetDays,dependsOn?}] } }` | Session Draft（`{name, steps[{name,description?,duration,dependencies[]}]}`） |
| Session Draft / ai_chat | 上記 | CreateProcessTemplateDto（`{ name, stepTemplates[{seq,name,basis,offsetDays,requiredArtifacts?,dependsOn?}] }`） |

備考:
- requiredArtifacts は将来拡張のため空配列扱い。

---

## APIタッチポイント（変更の有無）
- 変更なし（エンドポイント追加なし）。内部処理を拡張。
- Finalize のレスポンスに `processTemplateId` を追加する場合は後方互換のためオプション項目で。

---

## セキュリティ/権限/フラグ
- 権限: Finalize は実質「テンプレ作成」に相当。AIAgentController 側で Roles/Permissions が必要なら追加（templates:create）。
- フラグ（任意）:
  - `AI_FEATURE_TEMPLATE_DRAFT_SAVE`（Draft保存ON/OFF）
  - `AI_FEATURE_TEMPLATE_AUTO_CREATE`（Finalize時の自動作成ON/OFF）

---

## 監視・ログ・メトリクス
- 追加アクション:
  - `ai_draft_saved`（会話中のDraft保存）
  - `ai_template_created`（正式テンプレ登録）
  - `ai_template_conflict`（名称競合）
- 既存の `structured_json_ok` / フォールバックログは維持。
- dev 環境のメトリクス未登録による警告（例: `Metric 'ai_tokens_used' not found`）は既知。運用導入時に登録・抑制を行う。

---

## 後方互換性

- 既存のチャット応答/会話保存/エラーポリシーを変更しない。
- Draft保存とテンプレ登録は“付加機能”として動作（フラグで無効化可能）。

---

## テスト計画（抜粋）

- 単体
  - TemplateDraftMapper: 最小/境界/依存/負のoffsetDays 等の入力→Draft/DTO 期待形。
  - ProcessUserMessageUseCase: パース成功で `updateGeneratedTemplate` 呼び出し確認。
  - FinalizeTemplateCreationUseCase: 正常登録/名称競合/検証失敗の分岐。

- 統合
  - POST /messages → JSON付き応答 → セッションDraft保存 →（必要なら）GETで確認。
  - POST /finalize-template → 201 + processTemplateId → /process-templates で実体確認。

- E2E（任意）
  - 会話→Draft→Finalize→テンプレ一覧に表示。

---

## 段階導入プラン

1. TemplateDraftMapper 実装（UT含む）。
2. ProcessUserMessageUseCase に Draft保存フック（FeatureFlagでON/OFF）。
3. FinalizeTemplateCreationUseCase に 正式テンプレ登録と履歴更新。
4. Processor の要件抽出書き戻し（小タスク）。
5. 監視メトリクスの追加（開発/本番での登録差分を整理）。

---

## 影響範囲（想定ファイル）

- application/services/ai-agent/
  - `template-draft-mapper.service.ts`（実装）
  - `prompt-builder.service.ts`（済：出力制約強化）

- application/usecases/ai-agent/
  - `process-user-message.usecase.ts`（Draft保存処理を追加）
  - `finalize-template-creation.usecase.ts`（正式テンプレ登録追加）
  - `generate-template-recommendations.usecase.ts`（任意：Draft活用）

- application/usecases/process-template/
  - `create-process-template.usecase.ts`（変更なし、注入して呼ぶ）

- domain/ai-agent/repositories/
  - `interview-session.repository.interface.ts`（`updateGeneratedTemplate` 既存）
  - `template-generation-history.repository.interface.ts`（`markAsUsed` 既存）

- infrastructure/processors/
  - `ai-processing.processor.ts`（任意補強）

---

## オープン課題

- Finalize時の名称競合ポリシー（自動サフィックス vs UIでの再入力）。
- Draft.duration と正式 offsetDays の解釈統一（基準日/負値の扱い）。
- フロントの編集UIとAPIの境界（Draft編集をフロントで完結させるか、API側でも保持するか）。

---

## 付記

- 本ドキュメントは実装を伴わない設計レポートであり、既存実装を破壊しない前提で段階導入可能な案を示す。実装時は小規模PRに分割し、UT/統合テストで確認する。
