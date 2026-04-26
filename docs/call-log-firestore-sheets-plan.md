# 通話ログ保存とSheets運用ビュー実装計画

## 目的

050番号の通話を、後から確認・集計できる運用データとして保存します。初期実装ではFirestoreを正本、Google Sheetsを一覧ビューとして使います。

## 保存先

- Firestore database: `speech-assistant-logs`
- Collection: `callLogs`
- Google Sheets: `11klH3hxWcIWKLOVTBJGxPjATG5aai0a6D8z_F6yUO1A`

既存Firebaseのdefault databaseとは分け、他システムのデータと混ざらないようにします。

## 保存項目

- 通話ID、ストリームID、開始時刻、終了時刻、通話秒数
- 発信者番号、着信番号
- 文字起こし、発話ターン
- 用件、要約、折り返し要否
- 顧客名、顧客電話番号、希望日時
- 切断理由、OpenAI接続エラー

## Cloud Run環境変数

```text
EXTRACTION_ENABLED=true
CALL_LOG_FIRESTORE_ENABLED=true
CALL_LOG_FIRESTORE_DATABASE_ID=speech-assistant-logs
CALL_LOG_FIRESTORE_COLLECTION=callLogs
CALL_LOG_SHEETS_ENABLED=true
GOOGLE_SHEETS_SPREADSHEET_ID=11klH3hxWcIWKLOVTBJGxPjATG5aai0a6D8z_F6yUO1A
```

## 検証手順

1. `npm test` で構文を確認する。
2. `npm run check:realtime` でRealtime APIの疎通を確認する。
3. `npm run smoke:media-stream` で音声返却を確認する。
4. Cloud Runへデプロイし、050番号に実通話する。
5. Firestore `speech-assistant-logs/callLogs` とSheetsの追記行を確認する。

## 次の拡張

Sheets確認後、React管理画面でFirestoreを直接表示します。分析用途が増えた段階でBigQueryへの同期を追加します。

