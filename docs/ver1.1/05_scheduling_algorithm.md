# 05 スケジュール逆算アルゴリズム（決定仕様 v4）

## 役割
- **Domain**：`BusinessDayService`, `ReplanDomainService`
- **Application**：`PreviewReplan`, `ApplyReplan`（Tx）

## 入力/出力（Domain抽象）
- 入力：`goalDateUtc`, `stepTemplates(DAG)`, `existing(stepInstances)`, `lockedIds`, `holidays`
- 出力：`Plan{templateId→dueUtc}`, `Diff{stepId, oldDueUtc, newDueUtc}`

## 擬似手順（高粒度）
1. テンプレをトポロジカルソート。  
2. `basis=goal` は `goalDateUtc - offsetDays(営業日)`、`basis=prev` は **依存の最遅** + offset。  
3. 非営業日は最近接の営業日に補正。  
4. Diff生成時、`locked`/`done` は変更不可。

## エッジケース
- 連休/年跨ぎ、月末→翌月初。  
- 並列依存のうち一部遅延。  
- ゴール非営業日設定の補正。