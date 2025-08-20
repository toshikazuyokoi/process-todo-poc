# 20 内部設計 概要（v4）

## 目的と前提
- 目的：MVP〜Phase3に必要な内部設計（レイヤ別の型定義・クラス責務・主要シーケンス）を明確化し、**一貫した設計反復**を容易にする。
- 前提：
  - アーキ：**NestJS（Controller）＋ Application（UseCase）＋ Domain（Entities/Services）＋ Infrastructure（Repo/Gateway）**。
  - DB保存はUTC（APIもUTC ISO8601/Z）。表示はユーザーTZ（既定: Asia/Tokyo）。
  - DB命名は snake_case、API/TSは camelCase（Prismaでマッピング）。
  - 再計算は **Preview → Apply(Tx)** の二段階。`locked` ステップは再計算で変更されない。
  - 監査ログ（DIFF）を変更コマンドごとに記録。

## レイヤ構成（論理）
- **Interfaces / Presentation**：HTTP受入口（DTO検証、認可、UseCase起動）
- **Application**：トランザクション境界、ユースケース調停、ドメインサービス呼出、Repo操作
- **Domain**：不変条件と業務ルール（営業日・逆算・再計算・差分）。DB/フレームワーク非依存
- **Infrastructure**：Prisma Repository、Queue、Storage、Mail/Slack等の実装

## トランザクション境界
- `ApplyReplan`, `CreateCase`, `UpdateStep`, `AddArtifact` は **単一トランザクション**。
- `PreviewReplan`, 検索系は **参照トランザクション**（非ロック）。

## 例外・失敗時の方針（概要）
- 入力検証エラー：400系（DTO）
- 業務矛盾（循環依存など）：422系（DomainError）
- 競合（同時更新）：409系（VersionConflict / OptimisticLock）
- 予期せぬ失敗：500（Correlation ID付与）
