# 02 用語集（完全版 v4）

- **ProcessTemplate**：再利用可能な工程雛形。`StepTemplate[]` を含む。  
- **StepTemplate**：`basis('goal'|'prev')`, `offsetDays>=0`, `dependsOn[]`（DAG）, `requiredArtifacts[]`。  
- **Case**：テンプレから生成された案件（`goalDateUtc` を持つ）。  
- **StepInstance**：案件内ステップ。`dueDateUtc`, `assigneeId`, `status={todo,doing,done}`, `locked`。  
- **Artifact**：成果物（`file`/`link`）。S3キーまたはURLを保持。  
- **Replan**：`preview→apply(Tx)` の二段階再計算。  
- **Business Day**：土日＋`holidays` を非営業日とする判定。  
- **ETag/If-Match**：更新系の楽観ロック契約。  
- **Idempotency Key**：キュージョブ重複抑止に用いるキー（`stepId+plannedDueUtc`）。