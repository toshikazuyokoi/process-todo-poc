# 15 DevOps / CI-CD（v4）

## ブランチ戦略
- main（安定） / develop（統合） / feature/*（短命）
- PR必須、最低ユニットテスト合格

## CI（GitHub Actions）
- lint（eslint, prettier）
- unit（Jest/Vitest）
- integration（Testcontainers：Postgres/Redis）
- e2e（Playwright＋docker-compose）
- build（api/web）→ docker build → 画像登録

## CD
- dev環境：自動デプロイ（Compose or Fly/Render）
- prod：手動承認ゲート

## 環境変数
- `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `JWT_SECRET`
