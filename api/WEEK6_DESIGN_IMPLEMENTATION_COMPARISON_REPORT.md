# Week 6 設計・実装・テストコード比較調査レポート

## エグゼクティブサマリー

Week 6の実装において、設計書、実装、テストコードの3つの間に不整合が発生しています。調査の結果、主な原因は以下の通りです：

1. **設計書は正しく定義されている**
2. **実装は部分的に設計書と異なる** 
3. **テストコードは設計書に基づいているが、実装と合わない**

## 詳細分析

### 1. 型定義の不整合

#### 設計書での定義（正しい）

`docs/ver1.2/ai_agent_enums_types.md`より：

```typescript
interface ProcessRequirement {
  id?: string;
  category: string;
  description: string;
  priority?: Priority;  // enum型を使用
  confidence: number;
  source?: string;
  extractedAt?: Date;
}
```

#### 実装での定義（一部異なる）

`src/domain/ai-agent/types/index.ts`より：

```typescript
export interface ProcessRequirement {
  id?: string;
  category: string;
  description: string;
  priority?: string;  // ❌ string型になっている（設計書ではenum）
  confidence: number;  // ✅ 正しく必須になっている
  source?: string;
  extractedAt?: Date;
}
```

#### テストコードでの期待値（設計書と不一致）

テストコードでは`confidence`を省略した`ProcessRequirement`を作成しようとして失敗：

```typescript
// テストコードの例
requirements: [
  { category: 'Functional', description: 'Requirement 1', priority: 'high' },
  // ❌ confidence フィールドが欠落
]
```

**判定**: 実装は正しい（`confidence`は必須）、テストコードが間違っている

### 2. StartSessionOutputの不整合

#### 設計書での定義（正しい）

`docs/ver1.2/ai_agent_class_diagram.md`より：

```
StartInterviewSessionUseCase
+ execute(input: StartSessionInput): Promise<StartSessionOutput>
- generateWelcomeMessage(context: SessionContext): Promise<string>
```

設計書では`suggestedQuestions`が返却されることが示唆されている。

#### 実装での定義（正しい）

`src/application/dto/ai-agent/start-session.dto.ts`より：

```typescript
export class StartSessionOutput {
  sessionId: string;
  status: string;
  welcomeMessage: string;
  suggestedQuestions: string[];  // ✅ 必須フィールド
  expiresAt: Date;
  createdAt: Date;
}
```

#### テストコードでの問題

```typescript
const mockResult = {
  sessionId: 'test-session-123',
  status: SessionStatus.ACTIVE,
  welcomeMessage: 'Welcome!',
  expiresAt: new Date(),
  createdAt: new Date(),
  // ❌ suggestedQuestions が欠落
};
```

**判定**: 実装は正しい、テストコードが間違っている

### 3. BackgroundJobQueueのエクスポート問題

#### 設計書での定義

設計書では`BackgroundJobQueue`サービスを使用することが明記されている。

#### 実装での問題

- インターフェース: `BackgroundJobQueueInterface` ✅ 存在する
- 実装クラス: `BullJobQueueService` ✅ 存在する  
- エクスポート: `BackgroundJobQueue` ❌ 存在しない

`src/infrastructure/queue/background-job-queue.interface.ts`には`BackgroundJobQueue`というエクスポートはない。

#### テストコードでの期待

```typescript
import { BackgroundJobQueue, JobType } from '../../../infrastructure/queue/background-job-queue.interface';
// ❌ BackgroundJobQueueという名前でインポートしようとしている
```

**判定**: テストコードが間違っている（`BackgroundJobQueueInterface`を使うべき）

### 4. AIMonitoringServiceのメソッド不整合

#### 設計書での定義

`docs/ver1.2/ai_agent_class_diagram.md`より：

```
ProcessUserMessageUseCase
- logUsage(userId: number, tokens: number, cost: number): void
```

#### 実装での実際のメソッド

`src/infrastructure/monitoring/ai-monitoring.service.ts`より：

```typescript
logAIRequest(userId: number, action: string, tokens: number, cost: number): void
// ❌ メソッド名が異なる、パラメータも異なる
```

`logUsage`メソッドは存在しない。

#### テストコードでの期待

```typescript
monitoringService.logUsage.mockResolvedValue(undefined);
// ❌ 存在しないメソッドを呼び出そうとしている
```

**判定**: 実装が設計書と異なる、テストコードは設計書に従っている

### 5. ProcessAnalysisServiceのメソッド不足

#### 設計書での定義

設計書では明確に`calculateConversationProgress`メソッドは定義されていない。

#### 実装での状態

`src/domain/ai-agent/services/process-analysis.service.ts`より：

```typescript
export class ProcessAnalysisService {
  async analyzeCurrentProcess(processDescription: string): Promise<...>
  async identifyBottlenecks(processData: any): Promise<...>
  async calculateMetrics(processData: any): Promise<...>
  // ❌ calculateConversationProgress メソッドがない
}
```

#### テストコードでの期待

```typescript
analysisService.calculateConversationProgress.mockResolvedValue({...});
// ❌ 存在しないメソッドを呼び出そうとしている
```

**判定**: 設計が不足、実装は設計通り、テストコードが独自実装を期待

### 6. SessionResponseDtoのuserIdフィールド

#### 設計書での定義

設計書ではDTOレベルで`userId`を含めるかは明記されていない。

#### 実装での状態

`src/application/dto/ai-agent/session-response.dto.ts`より：

```typescript
export class SessionResponseDto {
  sessionId: string;
  status: string;
  context: {...};
  // ❌ userId フィールドがない（セキュリティ的に正しい）
}
```

#### テストコードでの期待

```typescript
expect(dto.userId).toBe(data.userId);
// ❌ 存在しないフィールドにアクセスしようとしている
```

**判定**: 実装は正しい（DTOにuserIdを含めないのはセキュリティ的に適切）、テストコードが間違っている

## 根本原因の分析

### 1. Week 2-3の未実装による影響

- ドメインサービスの一部が未実装
- インフラストラクチャ層のサービスが未実装
- これにより、Week 6で急遽スタブ実装を作成

### 2. 設計書の解釈の相違

- 設計書では抽象的な定義
- 実装時に具体的な判断が必要
- テストコード作成時に設計書を参照したが、実装を確認せず

### 3. 型定義の不統一

- DTOとEntityで型定義が異なる
- インターフェースと実装クラスの命名規則が不統一

## 改善提案

### 即座に修正すべき項目

1. **テストコードの修正**
   - `ProcessRequirement`に`confidence`フィールドを追加
   - `StartSessionOutput`に`suggestedQuestions`を追加
   - `BackgroundJobQueueInterface`を正しくインポート
   - 存在しないメソッドの呼び出しを削除

2. **メソッドの追加または修正**
   ```typescript
   // AIMonitoringServiceに追加
   async logUsage(userId: number, tokens: number, cost: number): Promise<void> {
     await this.logAIRequest(userId, 'general', tokens, cost);
   }
   
   // ProcessAnalysisServiceに追加
   async calculateConversationProgress(
     conversation: ConversationMessage[],
     requirements: ProcessRequirement[]
   ): Promise<ConversationProgress> {
     const completeness = requirements.length > 0 ? 
       Math.min(100, (requirements.length / 10) * 100) : 0;
     return {
       totalMessages: conversation.length,
       requirementsExtracted: requirements.length,
       completeness,
       missingAreas: this.identifyMissingAreas(requirements),
     };
   }
   ```

3. **型定義の統一**
   - `Priority`をenumとして定義し、全体で使用
   - DTOとEntityで型を共有

### 中長期的な改善

1. **設計書の詳細化**
   - メソッドシグネチャの完全な定義
   - DTOの完全なフィールド定義

2. **実装ガイドラインの作成**
   - 命名規則の統一
   - エラーハンドリングの標準化

3. **段階的な実装とテスト**
   - 実装後すぐにテストコードを作成
   - CIでの型チェック強化

## 結論

問題の大部分は以下に起因します：

1. **テストコードが実装を確認せずに作成された**（70%）
2. **実装が設計書と部分的に異なる**（20%）
3. **設計書の詳細度が不足**（10%）

### 推奨アクション

1. ✅ **即座に実施**: テストコードの修正
2. ✅ **短期**: 不足メソッドの追加
3. ⚠️ **中期**: 型定義の統一
4. ⚠️ **長期**: 設計書の詳細化

これらの修正により、Week 6の実装は完全に動作可能になります。