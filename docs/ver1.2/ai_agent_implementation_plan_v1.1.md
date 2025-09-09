## AIエージェント チャット応答 OpenAI 切替 — 実装計画 v1.1 (Draft)

作成日: 2025-09-04
対象ブランチ: feature/ai-agent-v1.2-openai-chat
設計準拠: docs/ver1.2/ai_agent_minimal_design_spec.md (v1.1)
要件準拠: docs/ver1.2/ai_agent_minimal_design_addendum.md (v1.0)

---

### 1. 目的と方針
- 目的: チャット応答をOpenAI経由に切替し、要件(日本語応答+末尾JSON)と設計v1.1を満たす
- 方針: 下層から“骨組み→配線→検証→観測”の順で小PRを積み上げ、ロールバック容易性と互換性を維持
- 非目標(Phase1): 自動テンプレ作成、コスト実値算出、応答キャッシュ

---

### 2. 前提・制約
- API契約は不変（aiResponse.contentにJSONが添付されるのみ）
- Feature Flag/DIでモック↔OpenAI切替が可能
- usage.tokensは実値、costは0(将来導入)
- JSONは ai_chat_process_template.v1 を厳密検証、失敗時も会話応答は返す（JSONなし）

---

### 3. 作業分割（PR構成）

#### PR1: インターフェイス/DI骨組み（追加のみ、既存動作不変）
- 目的: コンポーネントのIFを定義し、DIの切替点(AIConversationResponder)を用意
- 変更:
  - 型/IF: ChatMessage, OpenAIResponse, SessionContextDto, ProcessMessageInput/Output, AiChatProcessTemplateJson, TemplateDraftParseResult, AiChatSchemaId, AIConversationErrorCode
  - 新規クラス（雛形・例外を投げないスタブ）: PromptBuilder, HistoryAssembler, LLMOutputParser, TemplateDraftMapper
  - DIトグル: Token=AIConversationResponder, 実装=MockResponder(現行)/OpenAIResponder(後続), 環境AI_AGENT_MODEで切替（既定mock）
- 検証: 起動OK、既存のモック応答が変わらない
- 依存: なし

#### PR2: PromptBuilder/HistoryAssembler 実装
- 目的: 安定したSystem Promptと履歴N件/予算内メッセージ生成
- 変更:
  - PromptBuilder: 要件記述のsystem prompt雛形をcontextで埋め込み（日本語固定）
  - HistoryAssembler: N=12、utf8_bytes/4の概算でcontextBudgetに収める。古い履歴から間引き。最低限直近のuser/assistantペアは保持
  - 設定: OPENAI_MAX_TOKENS/履歴N/safetyMargin を設定サービス経由で参照
- 検証: ユニットで履歴トリミング・context反映・N変更の安定性
- 依存: PR1

#### PR3: OpenAI配線（AIConversationService差し替え）＋フォールバック
- 目的: 実際にOpenAIService.generateResponseを呼び、usage.tokensを反映、フォールバックを実装
- 変更:
  - OpenAIResponder: PromptBuilder/HistoryAssemblerによりmessagesを構成→OpenAI呼出→content+usage取得→リトライ最大1回→失敗時フォールバック（日本語固定・JSONなし・tokens=0）
  - UseCase(ProcessUserMessage): usage.tokensに実値反映（costは0）
  - 切替: AI_AGENT_MODE=openaiで実接続、既定はmock
- 検証: ユニットで429/5xx/timeout/成功を網羅、スモーク(キー無し時のエラーパス・フォールバック)
- 依存: PR1, PR2

#### PR4: LLMOutputParser 実装（厳密JSON抽出/検証）
- 目的: 回答末尾の構造化JSONを確実に抽出・検証・エラー分類
- 変更:
  - 抽出: 最後のフェンス優先、jsonラベル優先、フェンス32KB上限
  - 検証: 厳密JSON（コメント/末尾カンマ不可）、schema一致、stepTemplates連番/値域/seq=1はgoal
  - エラー分類: MissingFence/NonJsonFence/JsonParseError/SchemaMismatch/ValidationFailed
  - UseCase: 解析結果はログ/監査に記録（本文非保存）。API応答は従来どおり
- 検証: ユニットで各エラー分類ケース、結合でOpenAIResponder出力に対する抽出
- 依存: PR1, PR3（モックでも可だが現実に近いのはPR3後）

#### PR5: 観測/監査/安全装備（最小）
- 目的: 運用可視性と追跡性を確保
- 変更:
  - 監査ハッシュ: 正規化(role:content\n連結→空白圧縮→先頭1000文字)→SHA-256(AI_AUDIT_SALT+normalized)。SALT未設定時は無効化
  - メトリクス: ai_requests_total, ai_tokens_total, ai_errors_total{type}, ai_fallback_total, ai_retry_total
  - 切替確認: mock↔openaiの切替動作
- 検証: ユニット（ハッシュ再現性/SALT有無）、スモーク（メトリクス増分）
- 依存: PR3, PR4

---

### 4. 依存関係と順序
- PR1 → PR2 → PR3 → PR4 → PR5（直列推奨）
- リスク低減のためPR3の前にPR2を完了（入力の安定化）。PR4はPR3後が望ましい

---

### 5. 検証・品質保証
- ユニットテスト
  - PR毎に最小完結のテストを追加（履歴トリミング/プロンプト生成/リトライ・フォールバック/JSON抽出と検証/監査ハッシュ）
- 結合/スモーク
  - AI_AGENT_MODE=openai で簡易シナリオ（キーなし環境ではフォールバック動作確認）
- E2E
  - PR3後に最小E2E: メッセージ送信→応答→会話保存→WebSocket通知（OpenAIServiceはモック）
- 監視
  - フォールバック率、平均tokens、失敗種別をダッシュボード監視

---

### 6. ロールバック戦略
- 即時切替: AI_AGENT_MODE=mock でモックへ戻す
- 段階導入: ステージングでopenai→問題なければ本番で段階的に有効化
- PRごと: 小さくマージするため、問題発生時は直近PRのrevertで対処可

---

### 7. リスクと対策
- LLM出力逸脱→ Parserの厳密検証/最後のフェンス優先/上限サイズ
- トークン越境→ HistoryAssemblerの予算制御/安全マージン
- 監査・機微情報→ 本文非保存/ハッシュのみ/エラーカテゴリ分類
- UX: JSONフェンス露出→ Phase1は許容、将来UI折りたたみ

---

### 8. 完了基準（Phase1）
- OpenAI経由の応答が返る（日本語、末尾JSONが1つ）
- 失敗時フォールバック（JSONなし、tokens=0）
- usage.tokens が実値で記録
- 監査/メトリクスが最小限稼働
- 既存UI/API互換（表示崩れなし）

---

### 9. 見積もり（目安）
- PR1: 0.5〜1日
- PR2: 1日
- PR3: 1.5〜2日
- PR4: 1〜1.5日
- PR5: 0.5〜1日
（コードボリューム・レビュー速度に依存）

