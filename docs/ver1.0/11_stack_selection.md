# 11 技術スタック選定（確定 v4）

## Backend
- **NestJS 10 / Node 20 / TypeScript 5**
- **Prisma 5 + PostgreSQL 15**（ORM/移行）
- **BullMQ + Redis 7**（キュー/通知）
- 認証：JWT（MVP）→ OIDC（Phase4以降、Entra ID等）
- ストレージ：MinIO（dev）→ S3（prod）

## Frontend
- **Next.js 14（App Router） / React 18**
- UI：Tailwind CSS + Headless UI + DnD Kit（テンプレ編集のドラッグ操作）
- 可視化：簡易ガント/カレンダー（VisX 等）

## DevOps
- Docker / docker-compose（api/web/db/redis/minio）
- GitHub Actions（lint → unit → integration → e2e → build → docker push）
- テスト：Jest/Vitest（ユニット）、Playwright（E2E）、Testcontainers（統合）

## 選定理由（要点）
- 前後TypeScriptで型安全と開発速度を両立
- Prismaでスキーマ駆動・高速なDB迭代
- Next.jsでSSR/CSRの柔軟な切替と将来SEO対応
