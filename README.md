# 音声日記アプリ

Android で音声メモを録音し、OpenAI API で文字起こしと文章整形を行い、内容を確認してから Google スプレッドシートへ保存する Web アプリです。

## できること

- Android Chrome で録音する
- OpenAI で文字起こしする
- 日記タイトルと本文を自動整形する
- 保存前にタイトルと本文を編集する
- Google スプレッドシートへ保存する

## ローカル起動

```bash
npm run setup:deps
copy .env.example .env.local
npm run dev
```

このプロジェクトは同期ドライブ上でも壊れにくいように、依存関係を `%TEMP%\voice-journal-sheet-app-deps\...` に展開し、実行時はソースを `%TEMP%\voice-journal-sheet-app-workspace\...` に同期してから起動します。

- コードを変更したら `npm run dev` を再起動してください
- `.env.local` は Git に含めないでください

`.env.local` の例:

```env
OPENAI_API_KEY=sk-...
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_FORMATTING_MODEL=gpt-4.1-mini
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxxxx/exec
GOOGLE_APPS_SCRIPT_SECRET=change-me
```

## 外出先で使う方法

外出先で Android から録音したい場合は、ローカル起動ではなく公開デプロイが必要です。

理由:

- `localhost` や自宅 Wi-Fi 内の IP は外出先から開けません
- マイク録音に使う `getUserMedia()` は secure context が必要で、公開利用では `HTTPS` が実質必須です

参考:

- MDN `getUserMedia`: [https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- Vercel 環境変数: [https://vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)
- Vercel カスタムドメイン: [https://vercel.com/docs/getting-started-with-vercel/domains](https://vercel.com/docs/getting-started-with-vercel/domains)

## おすすめの公開方法

Next.js なので、まずは Vercel がいちばん簡単です。

### 1. GitHub に置く

このアプリを GitHub リポジトリに push します。

注意:

- もしリポジトリのルートが `G:\マイドライブ\お仕事(g)\ai\codes` 全体なら、Vercel 側で Root Directory を `voice-journal-sheet-app` に設定してください
- このアプリ単体を別リポジトリにしても構いません

### 2. Vercel に取り込む

1. Vercel にログイン
2. `Add New -> Project`
3. GitHub リポジトリを選ぶ
4. 必要なら `Root Directory` を `voice-journal-sheet-app` にする
5. Framework Preset が `Next.js` になっていることを確認
6. Deploy

### 3. 環境変数を入れる

Vercel の Project Settings -> Environment Variables に次を設定します。

```text
OPENAI_API_KEY
OPENAI_TRANSCRIPTION_MODEL
OPENAI_FORMATTING_MODEL
GOOGLE_APPS_SCRIPT_URL
GOOGLE_APPS_SCRIPT_SECRET
```

値はローカルの `.env.local` と同じで構いません。

### 4. 公開 URL で使う

デプロイが成功すると、`https://xxxxx.vercel.app` の URL が発行されます。

その URL を Android Chrome で開けば、外出先でも録音できます。

## Google スプレッドシート連携

1. 新しい Google スプレッドシートを作成
2. 1 行目に次のヘッダーを入れる

```text
recordedAt | polishedTitle | polishedBody | transcript
```

3. `拡張機能 -> Apps Script` を開く
4. 次のコードを貼り付ける

```javascript
const SECRET = "change-me";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);

  if (payload.secret !== SECRET) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "unauthorized" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    payload.recordedAt,
    payload.polishedTitle,
    payload.polishedBody,
    payload.transcript
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, rowNumber: sheet.getLastRow() })
  ).setMimeType(ContentService.MimeType.JSON);
}
```

5. Web アプリとしてデプロイ
6. 発行された URL を `GOOGLE_APPS_SCRIPT_URL` に設定
7. `SECRET` と `GOOGLE_APPS_SCRIPT_SECRET` を同じ値にする

## 補足

- `npm run build` はローカルで成功する状態です
- `npm run dev` も起動確認済みです
- 本番公開ではローカル回避スクリプトではなく、Vercel 上の通常の `node_modules` が優先利用されます
