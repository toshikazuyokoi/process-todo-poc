# 13 ディレクトリ構成（推奨 v4）

## Backend（/api）
```
/api
  /src
    /common        # DTO/guards/filters/interceptors/errors
    /domain
      /entities    # Case.ts, StepInstance.ts, ...
      /services    # BusinessDayService.ts, ReplanDomainService.ts
      /values      # Basis.ts, Offset.ts, DueDate.ts
    /application
      /usecases    # CreateCase.ts, PreviewReplan.ts, ApplyReplan.ts
      /dto         # request/response schemas
    /infrastructure
      /prisma      # schema.prisma, repositories
      /gateways    # mail.ts, slack.ts, storage.ts
      /jobs        # bullmq queues/processors
    /interfaces
      /controllers # cases.controller.ts, templates.controller.ts, steps.controller.ts
      /mappers     # dto <-> domain
```

## Frontend（/web）
```
/web
  /app
    /(public) login, dashboard, cases, templates
    /cases/[id]        # timeline, diff preview
    /templates/[id]    # D&D editor
  /components          # gantt, calendar, diff-panel, forms, dnd-steps
  /lib                 # api-client, auth, date-utils
  /styles
```
