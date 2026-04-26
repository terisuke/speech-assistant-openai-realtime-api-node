# 実装計画

この文書は、2026年版プロダクション移行ADRをGitHub issueと実装Waveへ落とし込むための計画です。

## 原則

- `050` 番号の恒久切替は最後に行う。
- Cloud Run前に、ローカルで実050着信の音声ループを検証する。
- 電話AI本線はTwilio Media StreamsとOpenAI Realtime WebSocketでサーバー側に置く。
- Reactは監視、設定、ナレッジ、引き継ぎのために使う。
- 人間オペレーターの通話参加にはTwilio Voice SDKのWebRTCを使う。
- モデル、VAD、音声、電話番号、ナレッジは設定として扱う。

## エピック

### Epic: 2026年版プロダクション移行

GitHub tracking issue: #20

プロトタイプを、日本のコールセンターで使える音声AI受付システムへ移行します。

サブissue:

1. #8 ローカル起動とスモークテスト
2. #6 TypeScript化とbackend分割
3. #7 OpenAI Realtime API/モデル更新
4. #10 VAD/ノイズ低減プロファイル
5. #9 Twilioローカル/現行番号検証
6. #12 Reactオペレーターコンソール
7. #11 通話状態イベントストリーム
8. #14 ナレッジ/RAG投入と検索
9. #13 Twilio Voice SDKソフトフォン
10. #15 AIパスアップ判定と通知
11. #17 Twilio Conference参加者制御
12. #16 Cloud RunとSecret Manager
13. #19 ログ、監査、プライバシー制御
14. #18 日本の050番号本番切替

## Wave

### Wave 1: ローカル音声ループ検証

- ローカルサーバーが起動する。
- OpenAI APIキーでRealtime GAセッションが作成できる。
- Twilio Media Streams互換のWebSocket経路が通る。
- ngrok経由で050番号からローカルへ着信できる。
- AI音声応答がTwilioへ返る。

### Wave 2: backend基盤更新

- TypeScript化する。
- 設定スキーマを追加する。
- Realtimeモデル、音声、文字起こし、VADを設定化する。
- 最低限のテスト基盤を整える。

### Wave 3: React管理画面

- 認証付きの管理画面を作る。
- 通話一覧、通話詳細、文字起こし、Realtimeイベントを表示する。
- assistant設定とVADプロファイルを編集できるようにする。

### Wave 4: ナレッジ/RAG

- ナレッジ文書を投入できる。
- インデックス状態を表示する。
- AI応答に参照元を紐づける。

### Wave 5: 人間への引き継ぎ

- AIがパスアップイベントを出す。
- オペレーターがReact画面で通知を受ける。
- Twilio Voice SDKでブラウザから通話へ参加する。
- Twilio ConferenceでAIのミュート/退出を制御する。

### Wave 6: Cloud Run本番基盤

- Docker化する。
- Secret Managerへ秘密情報を移す。
- WebSocket timeoutと再接続方針を検証する。
- webhook署名検証を有効化する。

### Wave 7: 050番号本番切替

- 本番Cloud Run URLへ050番号を向ける。
- 日本語通話シナリオを検証する。
- ロールバック手順を確認する。

## 初期作業順序

1. ローカル起動エラーを修正する。
2. `/`, `/healthz`, `/incoming-call` のスモーク検証を追加する。
3. `gpt-realtime-1.5` とGA `session.update` を検証する。
4. Media Streams互換WebSocketの疑似検証を追加する。
5. 050実着信をngrok経由で確認する。
6. 検証証跡をToEとして残す。
7. 次のPRでTypeScript化と設定スキーマへ進む。
