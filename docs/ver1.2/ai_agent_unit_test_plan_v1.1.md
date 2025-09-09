## AIエージェント チャット応答 OpenAI 切替 — ユニットテスト計画 v1.1 (Draft)

作成日: 2025-09-06
対象ブランチ: feature/ai-agent-v1.2-openai-chat
設計準拠: docs/ver1.2/ai_agent_minimal_design_spec.md (v1.1)
要件準拠: docs/ver1.2/ai_agent_minimal_design_addendum.md (v1.0)

---

### 1. 目的と方針
- 目的: フェーズ1(PR1〜PR5)の実装に対し、単体レベルで仕様準拠・回帰・エラー耐性を確認する
- 方針:
  - 外部依存や重い層は徹底的にモック/スタブ化
  - 正常/境界/異常(フォールバック含む)の網羅を優先、カバレッジは結果として70%目安
  - API契約は変更しない（テストは副作用・呼び出し・戻り値を検証）

---

### 2. テスト対象(新規/変更点)
- application/services/ai-agent/
  - prompt-builder.service.ts
  - history-assembler.service.ts
  - llm-output-parser.service.ts
  - openai-responder.service.ts
- application/usecases/ai-agent/process-user-message.usecase.ts
- application/usecases/ai-agent/ai-agent.module.ts（DI切替）
- application/interfaces/ai-agent/types.ts（構造化JSON定義類）
- application/interfaces/ai-agent/ai-conversation-responder.interface.ts（tokenCount追加）
- infrastructure/ai/openai.service.ts（overrideSystemPrompt追加）
- infrastructure/monitoring/ai-audit.service.ts（監査ハッシュ）
- infrastructure/monitoring/ai-monitoring.service.ts（ログ呼び出し対象）

---

### 3. 単体テスト戦略
- 正常系/異常系/境界を最小ユニットで検証
- 呼び出し回数・引数・戻り値・例外伝播・フォールバックを確認
- 監査・メトリクスは「呼び出しの発生」を確認、数値妥当性は計測層の責務

---

### 4. コンポーネント別テストケース

#### 4.1 PromptBuilder
- 目的: SessionContextDtoから日本語System Promptを生成
- モック: なし
- ケース:
  - 空コンテキストでも固定文言（日本語/構造化/JSON1個）が含まれる
  - industry/processType/goal/region+compliance/additionalContext の埋め込み
  - complianceが配列/文字列/未定義での表記差
  - 出力要件(末尾JSONフェンス)の文言が含まれる

#### 4.2 HistoryAssembler
- 目的: 直近N件の user/assistant を抽出し、systemPromptを先頭注入、予算でトリム
- モック: InterviewSessionRepository.findById（フェイクセッション）
- ケース:
  - user/assistantのみ抽出（systemは履歴からは除外）
  - windowSize=Nのスライス（古→新でN件）
  - systemPrompt指定時は先頭に挿入
  - 予算(utf8_bytes/4)超過時に先頭から削除（systemは極力保持）
  - 最低限、直近の user/assistant ペアを保持（長文で極端に削れても最後は2件）
  - セッション無し/会話無し→空配列
  - getRole()/toString()経由のロール取得の堅牢性

#### 4.3 LLMOutputParser
- 目的: 最終フェンスから厳密JSON抽出/検証/分類
- モック: なし
- ケース(エラー分類網羅):
  - MissingFence: フェンス無し
  - NonJsonFence: フェンスあるが {..} でない
  - FenceTooLarge: 32KB超
  - JsonParseError: JSON.parse例外（末尾カンマ等）
  - SchemaMismatch: schema != ai_chat_process_template.v1
  - ValidationFailed: 連番欠落(seq 1,3)、先頭basis!=goal、dependsOn範囲外/未来参照
  - 正常系: 空stepTemplates/正常stepTemplates（連番・先頭goal・依存OK）
  - 複数フェンス: 最後のフェンス優先、jsonラベル優先

- 追加テスト（曖昧表記/境界）:
  - フェンス言語ラベルのバリエーション: ```JSON``` / ```jsonc``` / ```json```（スペース無しのみ許容）
  - 改行コード CRLF 対応: ```json\r\n...``` のケース
  - フェンス優先順位: 非jsonフェンスが最後、途中に ```json``` がある場合は最後の json フェンスを拾えること
  - サイズ境界: 32KB ちょうどは許可、32KB+1 は拒否
  - JSON 厳密性の追加負例: キー重複・コメント混入

#### 4.4 OpenAIService（小回帰）

- 目的: overrideSystemPromptの優先適用
- モック: 内部OpenAIクライアント（chat.completions.create）
- ケース:
  - override指定時は buildSystemPrompt() 不使用で system=override がmessages[0]
  - override無し時は従来の buildSystemPrompt(context)
  - previousMessages がmessagesに順序保持で反映

#### 4.5 OpenAIResponder

- 目的: Prompt/Historyを用いてOpenAIService.generateResponse呼び出し（override付）、tokenCount反映
- モック: PromptBuilder, HistoryAssembler, OpenAIService, AIConfigService
- ケース:
  - 正常: content/metadata.tokensUsed を取得し tokenCount に反映
  - context.previousMessages に履歴が渡る
  - 第3引数 overrideSystemPrompt が使用される
  - 例外時: 例外を上位へ伝播（フォールバックはUseCase側の責務）

#### 4.6 ProcessUserMessageUseCase

- 目的: 入力検証→レート制限→セッション→会話更新→非同期→キャッシュ→usageログ→通知→進捗
- モック: Repository/RateLimit/Monitoring/Queue/Socket/Cache/Analysis/Responder
- 正常:
  - responder.tokenCount が aiResponse.tokenCount に反映、logUsage に記録
  - 会話に user/assistant が追加、updateConversation が呼ばれる
  - ジョブ(REQUIREMENT_ANALYSIS)投入、WebSocket通知
- 異常/フォールバック:
  - 入力不備・長文>2000 で DomainException
  - レート制限、セッション未発見/別ユーザー/非ACTIVE/期限切れで DomainException
  - responder 例外→ handleOpenAIError のリトライ後にフォールバック
  - フォールバック: 日本語固定文、suggestedQuestions空、confidence=0、tokenCount=0、estimatedCost=0、error=true
- JSON解析/監査:
  - parser成功→ monitoring.logAIRequest('structured_json_ok', tokens, cost)
  - 失敗→ monitoring.logAIError('parse_structured_json', Error([...]))
  - 監査ハッシュ: SALTあり→非null（ログ呼び出し発生）、SALTなし→null（未発生）

#### 4.7 AIAgentModule（DI切替）

- 目的: AI_AGENT_MODE=mock|openai でトークン解決先が切替
- モック: AIConfigService, AIConversationService, OpenAIResponder
- ケース:
  - mock→ AIConversationService 注入
  - openai→ OpenAIResponder 注入

#### 4.8 AIAuditService

- 目的: 正規化+SHA-256(SALT+normalized)
- モック: ConfigService（SALT）
- ケース:
  - SALTあり→hex文字列
  - SALTなし→null
  - 正規化（空白圧縮/1000文字切詰）の安定性

#### 4.9 AIMonitoringService（軽）

- 目的: ログAPI呼び出しの計測呼び出し
- モック: MetricsService
- ケース:
  - logAIRequest→ ai_requests_total 増分、ai_tokens_used/ai_cost_usd 記録
  - logAIError→ ai_errors_total 増分

---

### 5. フィクスチャ/テストデータ
- 会話サンプル: user/assistant 交互、長文で予算超過を誘発、不正ロール(toString小文字化)含む
- LLM出力サンプル: 正常JSON、末尾カンマ、複数フェンス(json/非json混在)、32KB超ブロック

---

### 6. モック/スパイ方針
- OpenAIService: jest.fn().mockResolvedValue({ content: '...', metadata: { tokensUsed: 123 } })
- InterviewSessionRepository: findById→簡易セッションスタブ（getConversation/addMessage動作）
- Monitoring/Queue/Socket/Cache/Analysis/RateLimit: 呼び出しと引数検証中心
- Env: process.env.AI_AGENT_MODE を一時変更（afterEachで復元）

---

### 7. 実施順序
1) LLMOutputParser
2) PromptBuilder / HistoryAssembler
3) OpenAIService（overrideの小回帰）
4) OpenAIResponder
5) AIAuditService
6) ProcessUserMessageUseCase
7) AIAgentModule（DI切替）

---

### 8. 成功基準
- 各コンポーネントの正常/異常/境界ケースが再現可能
- tokens実値・日本語フォールバック・JSON検証・監査ハッシュ・DI切替が仕様通りに動作
- カバレッジは結果として statements/branches 70%程度（目標）

---

### 9. リスクと注意
- Entity API依存の箇所はDTO化や軽量スタブで代替し、ユニットの独立性を維持
- 正規表現抽出は誤検出の余地→負例を厚めに
- OpenAIService署名変更の回帰→既存呼び出し箇所のユニットも軽くカバー（分析/テンプレ生成は影響最小の想定）

