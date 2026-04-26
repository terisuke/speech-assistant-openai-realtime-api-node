# Wave 1 実装計画: ローカル音声ループ検証

## 目的

Cloud Runや050番号の恒久切替へ進む前に、既存のOpenAI APIキーとTwilio経路で、ローカル環境から音声AI会話が成立することを確認します。

親エピック: #20  
主要issue: #8, #9  
関連issue: #7, #10, #19

## ブランチ運用

- base branch: `develop`
- 作業ブランチ: `feature/wave-1-*` または `fix/wave-1-*`
- マージ先: `develop`
- `main` はリリース専用

`main` と `develop` は保護されています。変更はPR経由で行います。

## スコープ

### 1. ローカル起動復旧

- `index.js` の重複importや未導入依存など、起動を妨げる問題を修正する。
- `npm run start`、`npm run check`、`npm test` を整備する。
- `.env` の必須値が無い場合は明確に失敗させる。

### 2. HTTP/TwiMLスモーク

- `/` または `/healthz` が応答することを確認する。
- `/incoming-call` がTwilio向けTwiMLを返すことを確認する。
- 実050番号に依存しないローカルスモークを用意する。

### 3. OpenAI Realtime疎通

- 既存APIキーでOpenAI Realtimeへ接続できることを確認する。
- 既定モデルは `gpt-realtime-1.5` とする。
- GA形式の `session.update` が受け入れられることを確認する。
- APIキーや秘密情報をログへ出さない。

### 4. Twilio Media Streams検証

- Twilio互換のWebSocketイベントをローカルで流す。
- `connected`、`start`、`media` の処理を確認する。
- OpenAI Realtimeから返った音声deltaをTwilio向け `media` payloadとして返せることを確認する。

### 5. 050実着信検証

- ngrokでローカルサーバーを公開する。
- 050番号のWebhookを一時的に `/incoming-call` へ向ける。
- 実電話から発話し、日本語文字起こしとAI音声応答を確認する。
- 検証後は必ず元のWebhookへ戻す。

## スコープ外

- Cloud Runデプロイ
- React管理画面
- RAG/ナレッジ
- 人間への引き継ぎ
- 050番号の恒久切替

## 受け入れ条件

- ローカルサーバーが起動する。
- `/incoming-call` が有効なTwiMLを返す。
- `npm run check:realtime` が成功する。
- `npm run smoke:media-stream` が成功する。
- 050実着信でOpenAI Realtimeへ接続し、AI音声応答が返る。
- Twilio webhookを元のURLへ戻したことを確認する。

## 完了成果物

1. 起動修正PR
2. 最小CI
3. ローカルスモーク
4. Realtime疎通スクリプト
5. Media Streams疑似検証
6. 050実着信のToE

## 次Waveへの条件

Wave 2は、Wave 1で実050着信の音声ループが成立した後に開始します。次はTypeScript化、設定スキーマ、VADプロファイル、Realtime API周辺の整理を進めます。
