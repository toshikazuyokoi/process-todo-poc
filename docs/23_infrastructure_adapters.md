# 23 インフラ層アダプタ（v4）

## Repository
- ProcessTemplateRepository：findById/list/save（保存時DAG検証）
- CaseRepository：getAggregate/saveAggregate/optimisticVersion（ETag）
- ArtifactRepository：list/add/remove
- HolidayRepository：get(country) → Set<date>
- AuditLogRepository：append(entry)

## Gateway
- StorageGateway（S3互換）：presigned発行、制限検証
- MailGateway：期限/遅延通知
- SlackGateway：通知チャネル投稿
- Queue（BullMQ）：ReminderJob（Idempotency Keyで重複抑止）