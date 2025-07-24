# Page snapshot

```yaml
- combobox: 🇯🇵 日本語
- text: ログインページ
- paragraph: アカウントにサインインして続行
- text: メールアドレス
- img
- textbox "メールアドレス": bocker.help@gmail.com
- text: パスワード
- img
- textbox "パスワード": Bocker_123
- button "パスワードを表示":
  - img
- button "ログイン":
  - text: ログイン
  - img
- link "サインアップ":
  - /url: /ja/sign-up
  - text: サインアップ
  - img
- region "Notifications alt+T"
- alert
- button "Open Next.js Dev Tools":
  - img
```