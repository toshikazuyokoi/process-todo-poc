# 25 シーケンス図（Mermaid・完全版 v4）

## 1) 案件作成（CreateCase）
```mermaid
sequenceDiagram
  participant UI as Next.js UI
  participant C as CasesController
  participant UC as CreateCase
  participant PT as ProcessTemplateRepo
  participant H as HolidayRepo
  participant D as ReplanDomainService
  participant CR as CaseRepository
  participant A as AuditLogRepo

  UI->>C: POST /cases {processId,title,goalDate}
  C->>UC: execute
  UC->>PT: findById(processId)
  UC->>H: get("JP")
  UC->>D: generatePlan(goalDate, steps, holidays)
  UC->>CR: saveAggregate(case+steps) (Tx)
  UC->>A: append(CaseCreated)
  UC-->>C: {caseId, etag, stepCount}
  C-->>UI: 201 Created
```

## 2) 再計算プレビュー（PreviewReplan）
```mermaid
sequenceDiagram
  participant UI
  participant C as CasesController
  participant UC as PreviewReplan
  participant CR as CaseRepository
  participant H as HolidayRepo
  participant D as ReplanDomainService

  UI->>C: POST /cases/:id/replan/preview {newGoalDate?}
  C->>UC: execute
  UC->>CR: getAggregate(caseId)
  UC->>H: get("JP")
  UC->>D: plan = generatePlan(goalDate', templates, holidays)
  UC->>D: diff = compare(existing, plan, locked)
  UC-->>C: ReplanDiffView
  C-->>UI: 200 OK
```

## 3) 再計算適用（ApplyReplan, Tx）
```mermaid
sequenceDiagram
  participant UI
  participant C as CasesController
  participant UC as ApplyReplan
  participant CR as CaseRepository
  participant H as HolidayRepo
  participant D as ReplanDomainService
  participant A as AuditLogRepo

  UI->>C: POST /cases/:id/replan/apply {confirmedChanges[]} + If-Match
  C->>UC: execute
  UC->>CR: getAggregate(caseId)
  UC->>H: get("JP")
  UC->>D: recompute plan/diff
  UC->>CR: beginTx()
  UC->>CR: apply(diff)  note right of CR: locked/doneは変更しない
  UC->>A: append(CaseReplanned)
  UC->>CR: commit()
  UC-->>C: {updatedCount, etag}
  C-->>UI: 200 OK
```

## 4) 成果物登録（presigned + AddArtifact）
```mermaid
sequenceDiagram
  participant UI
  participant C1 as StorageController
  participant ST as StorageGateway
  participant C2 as StepsController
  participant UC as AddArtifact
  participant AR as ArtifactRepo
  participant A as AuditLogRepo

  UI->>C1: POST /storage/presigned {stepId,fileMeta}
  C1->>ST: getPresignedUrl(meta)
  C1-->>UI: {url,fields,expiresAt}
  UI->>ST: PUT file
  UI->>C2: POST /steps/:id/artifacts {kind,ref,required?}
  C2->>UC: execute
  UC->>AR: add(stepId, artifact) (Tx)
  UC->>A: append(ArtifactAdded)
  C2-->>UI: 201 Created
```

## 5) 期限前通知ジョブ
```mermaid
sequenceDiagram
  participant S as Scheduler
  participant Q as Queue(BullMQ)
  participant NJ as NotificationJob
  participant CR as CaseRepository
  participant M as MailGateway

  S->>Q: enqueueReminder(stepId, whenUtc)
  Q->>NJ: trigger at whenUtc
  NJ->>CR: findStep(stepId)
  NJ->>M: send(to, subject, body)
  NJ-->>Q: done
```

## 6) テンプレ保存（DAG検証）
```mermaid
sequenceDiagram
  participant UI
  participant C as TemplatesController
  participant UC as SaveTemplate
  participant PR as ProcessTemplateRepo
  participant D as Domain(DAG Validator)

  UI->>C: PUT /templates/:id {steps[...]}
  C->>UC: execute
  UC->>D: validateDAG(steps)
  UC->>PR: save(template)
  C-->>UI: 200 OK
```

## 7) アーティファクト削除
```mermaid
sequenceDiagram
  participant UI
  participant C as StepsController
  participant UC as RemoveArtifact
  participant AR as ArtifactRepo
  participant A as AuditLogRepo

  UI->>C: DELETE /steps/:id/artifacts/:artifactId
  C->>UC: execute
  UC->>AR: remove(artifactId) (Tx)
  UC->>A: append(ArtifactRemoved)
  C-->>UI: 204 No Content
```

## 8) 案件一覧（ページング/検索）
```mermaid
sequenceDiagram
  participant UI
  participant C as CasesController
  participant UC as ListCases
  participant CR as CaseRepository

  UI->>C: GET /cases?page=1&size=20&sort=goalDate&order=asc
  C->>UC: execute(query)
  UC->>CR: list(query)
  C-->>UI: 200 OK {items[], page, size, total}
```