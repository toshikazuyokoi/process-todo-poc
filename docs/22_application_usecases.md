# 22 アプリケーション層 UseCase（v4）

| UseCase | 入力 | 出力 | Tx |
|---|---|---|---|
| CreateCase | processId, title, goalDate | caseId, stepCount | Yes |
| GetCase | caseId | CaseView | No |
| PreviewReplan | caseId, newGoalDate?, delayedStepIds? | ReplanDiffView | No |
| ApplyReplan | caseId, confirmedChanges[] + If-Match | updatedCount | Yes |
| UpdateStep | stepId, assigneeId?, status?, locked?, dueDate? | StepView | Yes |
| AddArtifact | stepId, kind, ref, required? | ArtifactView | Yes |
| RemoveArtifact | stepId, artifactId | 204 | Yes |
| ListCases | page,size,sort,order,filter | CaseSummary[] | No |