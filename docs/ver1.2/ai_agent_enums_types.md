# AIエージェント機能 - Enum・型定義書 v1.2

## 概要

本ドキュメントは、AIエージェント支援テンプレート作成機能で使用するEnum、型定義、定数を詳細に定義します。
実装時の型安全性確保と、ドメイン知識の明確化を目的とします。

## Enum定義

### SessionStatus
```typescript
enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}
```

### MessageRole
```typescript
enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}
```

### RequirementCategory
```typescript
enum RequirementCategory {
  GOAL = 'goal',
  CONSTRAINT = 'constraint',
  STAKEHOLDER = 'stakeholder',
  DELIVERABLE = 'deliverable',
  TIMELINE = 'timeline',
  QUALITY = 'quality',
  COMPLIANCE = 'compliance',
  RISK = 'risk'
}
```

### Priority
```typescript
enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CRITICAL = 'critical'
}
```

### ComplexityLevel
```typescript
enum ComplexityLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}
```

### ProcessCategory
```typescript
enum ProcessCategory {
  DEVELOPMENT = 'development',
  MARKETING = 'marketing',
  SALES = 'sales',
  OPERATIONS = 'operations',
  HR = 'hr',
  FINANCE = 'finance',
  LEGAL = 'legal',
  PROCUREMENT = 'procurement',
  MANUFACTURING = 'manufacturing',
  QUALITY_ASSURANCE = 'quality_assurance',
  CUSTOMER_SERVICE = 'customer_service',
  RESEARCH = 'research'
}
```

### JobStatus
```typescript
enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}
```

### JobType
```typescript
enum JobType {
  WEB_RESEARCH = 'web_research',
  TEMPLATE_GENERATION = 'template_generation',
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  KNOWLEDGE_BASE_UPDATE = 'knowledge_base_update'
}
```

### SourceReliabilityLevel
```typescript
enum SourceReliabilityLevel {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  VERY_LOW = 'very_low',
  UNKNOWN = 'unknown'
}
```

### CredibilityScore
```typescript
enum CredibilityScore {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNRELIABLE = 'unreliable'
}
```

## 型定義

### 基本データ型

#### SessionContext
```typescript
interface SessionContext {
  industry?: string;
  processType?: string;
  complexity?: ComplexityLevel;
  teamSize?: number;
  duration?: string;
  compliance?: string[];
  region?: string;
  budget?: number;
  timeline?: string;
}
```

#### MessageMetadata
```typescript
interface MessageMetadata {
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  tokenCount?: number;
  processingTime?: number;
  model?: string;
  temperature?: number;
}
```

#### AIContext
```typescript
interface AIContext {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  conversationHistory: ConversationMessage[];
  userContext: SessionContext;
}
```

#### TemplateContext
```typescript
interface TemplateContext {
  industry: string;
  processType: string;
  complexity: ComplexityLevel;
  stakeholders: string[];
  constraints: string[];
  deliverables: string[];
  timeline: string;
  complianceRequirements: string[];
}
```

### 分析・推奨関連型

#### ProcessAnalysis
```typescript
interface ProcessAnalysis {
  processType: ProcessCategory;
  complexity: ComplexityLevel;
  estimatedDuration: number;
  stakeholders: Stakeholder[];
  deliverables: Deliverable[];
  constraints: Constraint[];
  risks: Risk[];
  complianceRequirements: ComplianceRequirement[];
  confidence: number;
}
```

#### Stakeholder
```typescript
interface Stakeholder {
  name: string;
  role: string;
  responsibility: string;
  influence: 'high' | 'medium' | 'low';
  availability: string;
}
```

#### Deliverable
```typescript
interface Deliverable {
  name: string;
  description: string;
  type: 'document' | 'artifact' | 'approval' | 'milestone';
  format?: string;
  qualityCriteria: string[];
  dependencies: string[];
}
```

#### Constraint
```typescript
interface Constraint {
  type: 'time' | 'budget' | 'resource' | 'technical' | 'regulatory';
  description: string;
  impact: 'high' | 'medium' | 'low';
  mitigation?: string;
}
```

#### Risk
```typescript
interface Risk {
  description: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
  owner?: string;
}
```

#### ComplianceRequirement
```typescript
interface ComplianceRequirement {
  regulation: string;
  description: string;
  applicableSteps: string[];
  mandatoryControls: string[];
  documentation: string[];
  auditRequirements: string[];
}
```

### 推奨・生成関連型

#### TemplateRecommendation
```typescript
interface TemplateRecommendation {
  name: string;
  description: string;
  stepRecommendations: StepRecommendation[];
  alternatives: AlternativeRecommendation[];
  confidence: number;
  reasoning: string;
  estimatedDuration: number;
  complexity: ComplexityLevel;
  sources: string[];
}
```

#### StepRecommendation
```typescript
interface StepRecommendation {
  name: string;
  description: string;
  basis: 'goal' | 'prev';
  offsetDays: number;
  confidence: number;
  reasoning: string;
  requiredArtifacts: RequiredArtifact[];
  dependsOn: number[];
  alternatives: AlternativeStep[];
  source: 'knowledge_base' | 'ai_generated' | 'best_practice';
  estimatedHours?: number;
  skillsRequired?: string[];
  risks?: string[];
}
```

#### AlternativeRecommendation
```typescript
interface AlternativeRecommendation {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  suitableFor: string[];
  confidence: number;
}
```

#### AlternativeStep
```typescript
interface AlternativeStep {
  name: string;
  description: string;
  offsetDays: number;
  reasoning: string;
  confidence: number;
}
```

#### RequiredArtifact
```typescript
interface RequiredArtifact {
  kind: string;
  description: string;
  format?: string;
  template?: string;
  qualityCriteria?: string[];
  approvalRequired?: boolean;
}
```

### 検索・リサーチ関連型

#### SearchParameters
```typescript
interface SearchParameters {
  query: string;
  industry?: string;
  processType?: string;
  region?: string;
  language?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sourceTypes?: string[];
  maxResults?: number;
}
```

#### RawSearchResult
```typescript
interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: Date;
  author?: string;
  metadata?: Record<string, any>;
}
```

#### ResearchResult
```typescript
interface ResearchResult {
  title: string;
  source: string;
  url: string;
  relevanceScore: number;
  summary: string;
  keyInsights: string[];
  extractedSteps?: string[];
  credibilityScore: CredibilityScore;
  publishedDate?: Date;
  author?: string;
}
```

#### SourceReliability
```typescript
interface SourceReliability {
  domain: string;
  level: SourceReliabilityLevel;
  factors: {
    authorCredibility: number;
    sourceReputation: number;
    contentQuality: number;
    factualAccuracy: number;
    bias: number;
  };
  reasoning: string;
}
```

#### ValidationReport
```typescript
interface ValidationReport {
  overallReliability: SourceReliabilityLevel;
  consensusScore: number;
  conflictingInformation: ConflictInfo[];
  recommendations: string[];
  sources: SourceReliability[];
}
```

#### ConflictInfo
```typescript
interface ConflictInfo {
  topic: string;
  conflictingSources: string[];
  description: string;
  resolution?: string;
}
```

#### ProcessInsight
```typescript
interface ProcessInsight {
  category: 'step' | 'duration' | 'risk' | 'best_practice' | 'tool' | 'metric';
  description: string;
  confidence: number;
  sources: string[];
  applicability: number;
  actionable: boolean;
  implementation?: string;
}
```

### バックグラウンドジョブ関連型

#### WebResearchJobData
```typescript
interface WebResearchJobData {
  sessionId: string;
  query: string;
  industry: string;
  processType: string;
  parameters: SearchParameters;
  userId: number;
}
```

#### TemplateGenerationJobData
```typescript
interface TemplateGenerationJobData {
  sessionId: string;
  requirements: ProcessRequirement[];
  analysis: ProcessAnalysis;
  knowledgeBase: KnowledgeBaseResult[];
  userId: number;
}
```

#### RequirementAnalysisJobData
```typescript
interface RequirementAnalysisJobData {
  sessionId: string;
  conversation: ConversationMessage[];
  userId: number;
}
```

#### JobProcessor
```typescript
interface JobProcessor {
  process(job: Job<any>): Promise<void>;
}
```

#### Job<T>
```typescript
interface Job<T> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}
```

#### QueueStats
```typescript
interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
}
```

### エラー・通知関連型

#### ErrorInfo
```typescript
interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number;
}
```

#### ConversationSummary
```typescript
interface ConversationSummary {
  messageCount: number;
  duration: number;
  topics: string[];
  extractedRequirements: ProcessRequirement[];
  completionPercentage: number;
  nextSuggestedQuestions: string[];
}
```

## 定数定義

### AI設定定数
```typescript
const AI_CONSTANTS = {
  MAX_TOKENS_PER_REQUEST: 4000,
  MAX_TOKENS_PER_SESSION: 50000,
  DEFAULT_TEMPERATURE: 0.7,
  MAX_CONVERSATION_HISTORY: 50,
  SESSION_TIMEOUT_MINUTES: 60,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 1000,
} as const;
```

### 検索設定定数
```typescript
const SEARCH_CONSTANTS = {
  MAX_SEARCH_RESULTS: 10,
  CACHE_TTL_HOURS: 24,
  MIN_RELEVANCE_SCORE: 0.3,
  MAX_QUERY_LENGTH: 500,
  TIMEOUT_SECONDS: 30,
} as const;
```

### バリデーション定数
```typescript
const VALIDATION_CONSTANTS = {
  MIN_CONFIDENCE_SCORE: 0.1,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.5,
  MAX_REQUIREMENTS_PER_SESSION: 100,
  MAX_STEPS_PER_TEMPLATE: 50,
} as const;
```

---

**本Enum・型定義書は実装チームが参照する詳細仕様書です。型安全性を確保し、ドメイン知識を明確化するために使用してください。**
