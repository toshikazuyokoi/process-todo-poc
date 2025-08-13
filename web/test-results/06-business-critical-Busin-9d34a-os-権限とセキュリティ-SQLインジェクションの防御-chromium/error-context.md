# Page snapshot

```yaml
- banner:
  - link "Process Todo":
    - /url: /
  - navigation:
    - link "ホーム":
      - /url: /
    - link "案件":
      - /url: /cases
    - link "ガントチャート":
      - /url: /gantt
    - link "テンプレート":
      - /url: /templates
    - link "検索":
      - /url: /search
  - button
  - text: ユーザー1
- heading "詳細検索" [level=1]
- paragraph: 案件、テンプレート、ステップを横断的に検索
- textbox "キーワードで検索..."
- combobox:
  - option "すべて" [selected]
  - option "案件のみ"
  - option "テンプレートのみ"
  - option "ステップのみ"
- button "検索"
- button "詳細フィルタ"
- alert
```