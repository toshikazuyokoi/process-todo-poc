# Page snapshot

```yaml
- alert
- button "戻る"
- heading "新規案件作成" [level=1]
- button "保存"
- heading "基本情報" [level=2]
- text: 案件名
- textbox
- text: プロセステンプレート
- combobox:
  - option "選択してください" [selected]
- text: ゴール日付
- textbox: 2025-09-09
- text: ステータス
- combobox:
  - option "オープン" [selected]
  - option "進行中"
  - option "完了"
  - option "キャンセル"
- text: "0"
```