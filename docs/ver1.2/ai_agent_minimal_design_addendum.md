## AIエージェント チャット応答 OpenAI 切替 ― 最小設計追補 v1.0 (Draft)

作成日: 2025-09-04
状態: Draft（レビュー前）
担当: AI エージェント開発

---

### 目的
- 現行のモック応答（AIConversationService）を、OpenAI 経由の実応答に切り替える。
- 品質・安全性・保守性を満たすため、曖昧さを排し、実装前に設計を確定する。

### スコープ（Phase 1）
- AIConversationService.processMessage → OpenAIService.generateResponse の配線。
- System Prompt・履歴取り込み・応答形式の確定（日本語・簡潔・構造化）。
- usage(tokens/cost) の実値記録（cost は導入タイミングを決める）。
- リトライ/フォールバック、監視・監査の最小方針。

### 非スコープ（将来フェーズ）
- suggestedQuestions の LLM 生成、confidence 推定の厳密化。
- 応答キャッシュの有効化、会話要約投入、関数呼び出し・ツール連携。

---

## 1) System Prompt 仕様

#### 目的
- ドメイン前提/回答方針を固定し、安定した日本語応答と安全性を確保。

#### 仕様（提案）
- ロール: 業務プロセス設計・テンプレート作成支援アシスタント。
- 言語: 常に日本語（ユーザーが英語入力でも日本語で返答）。
- スタイル: 丁寧体、冗長回避、箇条書き優先、具体例は必要最小限。
- 安全: PII・機密・法的助言は抑制。確信度が低い場合は前提/不確実性を明示し、追質問を促す。

#### System Prompt（雛形）
- コンテキストは存在する項目のみ箇条書きで埋め込む。
- 可能であれば「回答 → 次の確認事項」の順で簡潔に提示。

```
あなたは業務プロセスの設計・改善を支援する専門アシスタントです。
以下の文脈を前提に、日本語で簡潔かつ構造化（箇条書き中心）して回答してください。

[文脈]
- 業界: {industry}
- プロセス種別: {processType}
- ゴール: {goal}
- 地域/規制: {region}/{compliance}
- 追加前提: {additionalContext}

ポリシー:
- 不確実な点は想定・前提を明示し、必要な追加情報を最後に箇条書きで尋ねる。
- 個人情報・機密情報の再掲や推測は行わない。
- 法的/規制の解釈が必要な場合は一般的留意点の範囲で述べるに留める。
- 長文化を避け、最大でも3〜6項目の箇条書きを基本とする。
```

レビュー決定事項:
- [ ] 文面の最終承認
- [ ] 追加すべき禁止事項/留意点

### 出力フォーマット（必須・後方互換配慮）

- 目的: チャット応答の末尾に、将来のテンプレート生成へ直結可能な厳密JSONを添付し、後工程の変換を容易にする。
- 互換性: 先頭は人間可読の日本語回答（従来どおり）。末尾に JSON フェンスを付与（UIは無視してもOK、将来パーサで利用）。
- 形式: 以下の JSON をコードフェンス（言語: json）で必ず添付。
- スキーマID: "ai_chat_process_template.v1"

JSON スキーマ（概念）:

```json
{
  "schema": "ai_chat_process_template.v1",
  "answer": "日本語の要約回答（Markdown可）",
  "missing_information": ["次に確認したい事項", "..."],
  "process_template_draft": {
    "name": "テンプレート名（任意・無ければ 'Draft from chat'）",
    "stepTemplates": [
      {
        "seq": 1,
        "name": "ステップ名",
        "basis": "goal",            // seq=1 は必ず 'goal'
        "offsetDays": -5,             // basis からの相対日数（整数）。初期は duration を日換算で可
        "requiredArtifacts": [        // 生成できない場合は空配列
          { "kind": "要件定義書", "description": "初稿" }
        ],
        "dependsOn": []               // 依存は seq の配列（例: [1]）
      },
      {
        "seq": 2,
        "name": "次工程",
        "basis": "prev",            // 2以降は 'prev' を推奨
        "offsetDays": 3,
        "requiredArtifacts": [],
        "dependsOn": [1]
      }
    ]
  }
}
```

注記:

- seq は 1 からの連番。dependsOn は seq を参照（IDではなく並び）。
- basis ルール: seq=1 は 'goal'、以降は 'prev' を原則とする（例外が明確な場合のみ 'goal' 可）。
- offsetDays は日単位整数。時間見積りしかない場合は切上げ/丸め（設計時は切上げ推奨）。
- requiredArtifacts の kind は簡潔な資産名。説明は任意。

出力例（応答末尾に必ず付与）:

```json
{
  "schema": "ai_chat_process_template.v1",
  "answer": "上位目標に対して、以下の進め方を提案します。\n- 事前準備\n- キックオフ\n- 初期要件定義\n...",
  "missing_information": ["対象領域の範囲定義", "品質基準(受入条件)"],
  "process_template_draft": {
    "name": "SaaS新規立上げ 初期プロセス(ドラフト)",
    "stepTemplates": [
      {"seq":1, "name":"事前準備", "basis":"goal", "offsetDays": -14, "requiredArtifacts":[{"kind":"ビジョン文書"}], "dependsOn": []},
      {"seq":2, "name":"キックオフ", "basis":"prev", "offsetDays": 2, "requiredArtifacts":[], "dependsOn": [1]},
      {"seq":3, "name":"初期要件定義", "basis":"prev", "offsetDays": 5, "requiredArtifacts":[{"kind":"要件一次版"}], "dependsOn": [2]}
    ]
  }
}
```

LLMへの指示追加:
- 「人間向け回答の後に、上記 JSON をコードフェンスで正確に1個だけ出力。不要な文/余計な鍵は追加しない。」
- 「JSON は厳密に有効な形式。null を返す場合もプロパティ自体を省略せずに空配列/空文字で対応しない（未生成時は process_template_draft 全体を省略可）。」

#### パーサとマッピング規則（LLM JSON → CreateProcessTemplateDto）
- 入力: 上記 JSON（schema=ai_chat_process_template.v1）。
- 検証:
  - schema が一致
  - stepTemplates は配列、各要素に seq(>=1), name(非空), basis('goal'|'prev'), offsetDays(整数), requiredArtifacts(配列), dependsOn(配列) が存在
  - seq は 1..N の連番（欠番不可）。seq=1 の basis は 'goal' 固定。
  - dependsOn は seq の集合に含まれ、循環推定があれば拒否（Create 前に検出）。
- 変換（ProcessTemplateDraftDto）：
  - name: process_template_draft.name || 'Draft from chat'
  - stepTemplates: 各要素を { seq, name, basis, offsetDays, requiredArtifacts, dependsOn } にマップ
- 例外処理:
  - 不足項目がある場合はパースを中断し、UI に missing_information を提示（テンプレは保存しない）。
- ロギング: schema バージョン・検証エラーを監査に残す（本文は保存しない）。

---

## 2) 履歴ポリシー（トークン抑制）

#### 取り込みルール（Phase 1）
- ウィンドウ: 直近 N=12 メッセージ（user/assistant 合計）。
- 並び: system → 過去履歴（古→新）→ user（今回の発話）。
- トークン上限制御: 推定で上限超過しそうな場合は古い履歴から削除。
- メタデータ（confidence/tokenCount 等）は LLM 入力に含めない。

将来（Phase 2）:
- 旧履歴の圧縮用に「会話要約メッセージ」を追加し、詳細は破棄。

レビュー決定事項:
- [ ] N（初期 12）の承認
- [ ] 上限制御のしきい値（max_tokens と履歴バジェット）

---

## 3) 応答メタデータ（tokens/cost・confidence・suggestedQuestions）

#### tokens/cost（提案）
- tokens: OpenAI response.usage.total_tokens を採用。
- cost: モデル単価を環境変数で管理（導入タイミングを選択）。
  - 例: OPENAI_PRICE_INPUT, OPENAI_PRICE_OUTPUT（USD/token）。実算は prompt/completion で分割可能だが Phase1 は total_tokens × 単価係数でも可。
- ProcessUserMessageUseCase.logUsage へ実値を渡す（cost 未導入時は 0）。

#### confidence
- Phase 1: 未設定（undefined）。固定値の廃止。
- 将来: self-assessment を JSON で返させて採用（OpenAIService 拡張）。

#### suggestedQuestions
- Phase 1: 空配列。
- 将来案A: 本回答と同時に JSON で返却。
- 将来案B: セカンダリプロンプトで生成。

レビュー決定事項:
- [ ] cost 実装の導入時期（Phase1 で導入/後日）
- [ ] モデル単価の定義方法

---

## 4) エラー/リトライ/フォールバック

#### リトライ対象
- HTTP 429, 5xx、ETIMEDOUT、ECONNRESET 等の一時障害。

#### リトライ戦略（初期値）
- 最大試行: 2（初回 + 再試行1回）
- バックオフ: 1.5s（指数 1.0s→2.0s でも可）

#### フォールバック応答（日本語）
- 「現在AI応答の生成で問題が発生しました。しばらくしてから再度お試しください。必要であれば、要件や前提条件をもう一度共有してください。」
- ユーザー向けには詳細原因を出さない。ログ/監視でエラー種別・リトライ回数は記録。

レビュー決定事項:
- [ ] 試行回数・待機時間
- [ ] フォールバック文面

---

## 5) キャッシュ方針

- 会話キャッシュ: 現状通り（セッション単位の履歴キャッシュ）。
- 応答キャッシュ: Phase 1 は無効（個別性が高い）。
  - 将来キーデザイン: hash(sessionId + 正規化メッセージ + 抜粋コンテキスト)。
  - TTL: 60秒〜5分。機能フラグ AI_FEATURE_CHAT_CACHE で切替。

レビュー決定事項:
- [ ] Phase 1 の無効化に合意
- [ ] 将来の TTL・キー設計の方向性

---

## 6) セキュリティ/プライバシー/監査

- PII最小化: コンテキストに不要な個人情報は送らない。会話本文そのままの再掲は避ける。
- ログ/監査: プロンプト本文の保存は避け、ハッシュまたは短い要約のみ。エラー詳細は内部ログに限定。
- フィーチャーフラグ: AIFeatureFlagGuard で機能切替を継続。
- OPENAI_API_KEY 未設定時は実行せず明示エラー（OpenAIService 実装準拠）。

レビュー決定事項:
- [ ] 監査ログに残す/残さない情報の確定

---

## 7) 実行パラメータ（初期値・環境変数）

- OPENAI_MODEL: 既定（gpt-4-turbo-preview など環境設定）。
- OPENAI_TEMPERATURE: 0.3（安定化）。
- OPENAI_MAX_TOKENS: 1200。
- 履歴件数 N: 12。
- リトライ: 1回（合計2試行）。バックオフ: 1.5s。
- コスト: Phase 1 は 0（または total_tokens×単価係数）。

レビュー決定事項:
- [ ] 上記初期値の承認/調整

---

## 8) API/契約（互換性）

- 変更なし。ProcessUserMessageUseCase のレスポンススキーマは維持。
  - aiResponse.confidence の固定値撤廃により undefined になり得るが DTO は optional のため互換。
  - usage は tokens を実値化（cost は 0 でも可）。

---

## 9) テスト戦略

- ユニット（AIConversationService）
  - OpenAIService をモック。正常/429/503/timeout/フォールバックを網羅。
  - 履歴ウィンドウ N のトリミングを検証。
- ユースケース（ProcessUserMessageUseCase）
  - usage の tokens 実値反映の検証（cost は 0 または算出）。
  - リトライ発火/フォールバック経路。
- E2E
  - 送信→応答→会話保存→WebSocket通知の一連。OpenAIService はスタブで再現。
- ゴールデンテスト（軽量）
  - システムプロンプト変更が破壊的でないことを確認（厳密な文面一致は避ける）。

---

## 10) 監視・運用

- メトリクス
  - ai_requests_total, ai_tokens_used, ai_errors_total, ai_cost_usd（cost導入後）。
- ダッシュボード
  - リトライ率、フォールバック率、平均応答トークン、P95 レイテンシ。
- アラート
  - 連続エラー率 > X%、429 多発、cost 急騰（導入後）。

---

## 11) 実装影響とロールアウト

- 影響コード
  - AIConversationService.processMessage（モック→OpenAI 呼び出し）。
  - ProcessUserMessageUseCase（usage の実値反映、固定値削除）。
  - 設定/環境変数（OPENAI_*）。
- ロールアウト
  - ステージングでメトリクス監視 → フィーチャーフラグで徐々に有効化。
  - 問題時は即時フラグ無効でモックに戻せるよう分岐を残す（短期）。

---

## 12) 検収基準（Acceptance Criteria）

- モック定型文が出ず、日本語で意味のある応答が返る。
- 履歴 N の変更でエラーなく動作、トークン上限制御が機能。
- 障害時に日本語フォールバックが返る。リトライ/ログが記録される。
- usage.total_tokens が 0 以外の実値を記録（cost は方針に従う）。
- API レスポンス互換でフロントのUI崩れなし。

---

## 13) オープン事項（要レビュー）

1) System Prompt 最終文面の承認。
2) 履歴件数 N=12 と max_tokens=1200 の承認/調整。
3) cost 算出の導入時期と単価定義（Phase1 で 0 維持 or 実値）。
4) フォールバック文面の確定。
5) 応答キャッシュ（Phase1 は無効のまま）可否・将来方針。

---

## 付録A: コード対応表

- 応答生成: domain/ai-agent/services/ai-conversation.service.ts
- OpenAI 呼び出し: infrastructure/ai/openai.service.ts
- メッセージ処理: application/usecases/ai-agent/process-user-message.usecase.ts
- DTO/Mapper: application/dto/ai-agent/*.ts, domain/ai-agent/mappers/*.ts
- 監視/監査: infrastructure/monitoring/*, interfaces/controllers/ai-agent.controller.ts（Audit）

---

## 反復計画
- v1.0（本書）レビュー → 承認事項を反映して v1.1 を確定。
- v1.1 確定後に実装ブランチ着手（小PR分割）。

