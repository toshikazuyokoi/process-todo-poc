// プロセステンプレート
export interface ProcessTemplate {
  id?: number
  name: string
  version: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  stepTemplates?: StepTemplate[]
}

// ステップテンプレート
export interface StepTemplate {
  id?: number
  processId?: number
  seq: number
  name: string
  basis: 'goal' | 'prev'
  offsetDays: number
  requiredArtifacts: Array<{ kind: string; description?: string }>
  dependsOn: number[]
  createdAt?: string
  updatedAt?: string
}

// ケース（案件）
export interface Case {
  id?: number
  processId: number
  title: string
  goalDateUtc: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdBy?: number
  createdAt?: string
  updatedAt?: string
  stepInstances?: StepInstance[]
  progress?: number
}

// ステップインスタンス
export interface StepInstance {
  id?: number
  caseId: number
  templateId: number
  name: string
  dueDateUtc: string | null
  assigneeId?: number | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled'
  locked: boolean
  createdAt?: string
  updatedAt?: string
  commentCount?: number
}

// 再計画リクエスト
export interface ReplanRequest {
  goalDateUtc: string
  lockedStepIds?: number[]
}

// 再計画プレビュー
export interface ReplanPreview {
  caseId: number
  oldGoalDate: string
  newGoalDate: string
  diffs: StepDiff[]
  criticalPath: number[]
}

// ステップ差分
export interface StepDiff {
  stepId: number
  stepName: string
  oldStartDate: string | null
  newStartDate: string | null
  oldDueDate: string | null
  newDueDate: string | null
  isLocked: boolean
}

// ユーザー
export interface User {
  id: number
  email: string
  name: string
  role: 'ADMIN' | 'USER'
  createdAt?: string
  updatedAt?: string
}

// 休日
export interface Holiday {
  id?: number
  date: string
  name: string
  countryCode: string
}