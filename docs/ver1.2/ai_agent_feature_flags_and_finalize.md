# AI Agent v1.2 – Feature Flags と Finalize フロー

このドキュメントは、AI Agent v1.2で導入したFeature FlagとDraft→Finalize（正式テンプレ登録）のフロー、および運用上の注意点をまとめます。

## 1. Feature Flags

- グローバル環境変数（接頭辞: `AI_FEATURE_`）でON/OFFを管理します。`FeatureFlagService`が `AI_FEATURE_` プレフィックスを読み込み、フラグ名を小文字化して内部管理します。
- 代表フラグ
  - `AI_FEATURE_TEMPLATE_DRAFT_SAVE` → 内部キー: `template_draft_save`
    - 既定: OFF（未設定時）
    - 意味: 会話処理（ProcessUserMessageUseCase）でLLMの構造化出力をDraftとしてセッションに保存し、必要に応じて通知します。
  - `ai_agent`（デコレータ @FeatureFlag('ai_agent')）
    - AI機能全体の有効化/無効化
  - `ai_template_generation`（デコレータ @FeatureFlag('ai_template_generation')）
    - Finalizeエンドポイント等、テンプレート生成系機能の有効化/無効化

設定例（.env）

```
AI_FEATURE_TEMPLATE_DRAFT_SAVE=true
```

## 2. Draft保存（参考：PR2）

- トリガ: LLM応答の末尾JSON（ai_chat_process_template.v1）が正しくパースされた場合
- 処理: TemplateDraftMapper.toSessionDraft() → InterviewSessionRepository.updateGeneratedTemplate()
- 通知: SocketGateway.notifyTemplateGenerated()（必要に応じて）
- 互換性: APIレスポンスは従来どおり。Draftのみセッションに保存。

## 3. Finalize（PR3）

- エンドポイント: POST /api/ai-agent/sessions/:sessionId/finalize-template
- ガード/フラグ: JwtAuthGuard, AIRateLimitGuard, AIFeatureFlagGuard + @FeatureFlag('ai_template_generation')
- フロー:
  1) セッションからDraft取得（なければエラー）
  2) modifications（name/description、軽微なsteps上書き）を適用
  3) TemplateRecommendationServiceでvalidate/optimize
  4) TemplateDraftMapper.toCreateDtoFromDraft()でCreate DTO生成
  5) CreateProcessTemplateUseCase.execute()で正式テンプレ作成
  6) TemplateGenerationHistoryRepository.save()で履歴保存（processTemplateId, wasUsed, modifications等）
  7) InterviewSessionRepository.markAsCompleted()でセッション完了
  8) FinalizeTemplateResponseDtoを返却（templateIdは入力のtemplateIdを返却）

レスポンス例

```
{
  "templateId": "template-1",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Draft Name",
  "description": "Draft description",
  "steps": [...],
  "metadata": { "version": "1.0", "createdBy": "AI Agent" },
  "createdAt": "2025-09-09T00:00:00.000Z",
  "status": "finalized"
}
```

## 4. 運用ノート

- 既存互換性: Feature FlagがOFF、またはDraft不在の場合は従来と同等の挙動（Finalizeはエラー応答）。
- 監査/監視: Finalize成功/失敗のログが記録されます。エラー時のログキーは実装に準拠。
- ネーミング競合: CreateProcessTemplateUseCaseは名前重複でConflictException。UI側での名称調整または再入力が必要。
- セッションクリーンアップ: 完了済みセッションのDraft保持/削除は運用方針に依存（現状保持）。

## 5. テスト

- UseCase UT: finalize-template-creation.usecase.spec.ts
- Controller統合テスト: ai-agent.controller.integration.spec.ts
  - 事前にAIInterviewSessionへDraftをseed
  - エンドポイント呼び出し後、ProcessTemplate作成とセッション完了を検証

## 6. 既知の課題/拡張

- modificationsの適用範囲は最小（name/description＋stepsの軽微上書き・新規追加）。
- ステップ削除/並び替え/依存関係再構成など大規模編集は別Issueで要検討。

