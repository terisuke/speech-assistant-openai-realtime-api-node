# Cloud Runデプロイ手順

## 目的

ローカル検証済みのNode/Fastify + Twilio Media Streams + OpenAI Realtime構成を、Google Cloud Run上で常時起動できる最小基盤として動かします。

## 前提

- GCP project: `aipartner-426616`
- Cloud Run region: `asia-northeast1`
- Cloud Run service: `speech-assistant-realtime`
- Secret Manager secret: `openai-api-key`
- GitHub repository: `Cor-Incorporated/speech-assistant-openai-realtime-api-node`

## 手動デプロイ

```bash
gcloud run deploy speech-assistant-realtime \
  --project aipartner-426616 \
  --region asia-northeast1 \
  --source . \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --concurrency 20 \
  --timeout 3600 \
  --cpu 1 \
  --memory 512Mi \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest \
  --set-env-vars REALTIME_MODEL=gpt-realtime-1.5,TRANSCRIPTION_MODEL=gpt-4o-transcribe,EXTRACTION_MODEL=gpt-5.4-mini,EXTRACTION_ENABLED=false,VOICE=marin,AUDIO_FORMAT=audio/pcmu,AUDIO_NOISE_REDUCTION=near_field,VAD_TYPE=server_vad,VAD_THRESHOLD=0.65,VAD_PREFIX_PADDING_MS=300,VAD_SILENCE_DURATION_MS=700,VAD_EAGERNESS=low,LOG_TRANSCRIPTS=false,LOG_OPENAI_RESPONSES=false
```

## CI/CD

`.github/workflows/deploy-cloud-run.yml` は `develop` へのpush時、または手動実行時にCloud Runへデプロイします。

認証はGitHub Actions OIDC + Google Cloud Workload Identity Federationを使います。長期のGCPサービスアカウントキーはGitHubへ保存しません。

## Twilio設定

Cloud Runデプロイ後、サービスURLが次のように得られます。

```bash
gcloud run services describe speech-assistant-realtime \
  --project aipartner-426616 \
  --region asia-northeast1 \
  --format='value(status.url)'
```

一時検証ではTwilio番号のVoice URLを次の形式にします。

```text
https://<cloud-run-url>/incoming-call
```

本番の050番号恒久切替は、Cloud Run上で `/health`、`/incoming-call`、実通話、ログ、署名検証を確認してから行います。

## 注意点

- `--min-instances 1` により常時待機します。費用が発生するため、不要になったら0へ戻します。
- Cloud RunのWebSocketはリクエストtimeoutの影響を受けます。現時点では `3600` 秒に設定します。
- 本番ではTwilio webhook署名検証を追加してから050番号を恒久切替します。
