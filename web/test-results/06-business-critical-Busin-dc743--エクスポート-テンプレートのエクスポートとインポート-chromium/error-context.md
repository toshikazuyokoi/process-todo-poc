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
- heading "テンプレート管理" [level=1]
- button "新規テンプレート作成"
- paragraph: プロセステンプレートの作成と管理
- textbox "テンプレート名で検索..."
- combobox:
  - option "すべてのカテゴリ" [selected]
- combobox:
  - option "すべて" [selected]
  - option "有効"
  - option "無効"
- button "検索"
- alert
```