#!/usr/bin/env bash
# Resumable translation loop: every script is idempotent and skips finished
# items, so this simply re-runs them until nothing is missing. Groq's free tier
# allows ~200k tokens/day/model; the loop rides that window.
cd "$(dirname "$0")/../.." || exit 1
ENV="${AQUAVO_ENV_FILE:-../FishWebClean/.env}"
while true; do
  node --env-file="$ENV" --import tsx TOOLS/i18n/translate-ui.ts --locale=en --model=openai/gpt-oss-20b
  node --env-file="$ENV" --import tsx TOOLS/i18n/translate-ui.ts --locale=ckb --model=openai/gpt-oss-120b
  AQUAVO_TRANSLATE_MODEL=openai/gpt-oss-20b node --env-file="$ENV" --import tsx TOOLS/i18n/translate-content.ts --locale=en --concurrency=1
  AQUAVO_TRANSLATE_MODEL=openai/gpt-oss-120b node --env-file="$ENV" --import tsx TOOLS/i18n/translate-content.ts --locale=ckb --concurrency=1
  echo "=== loop pass finished $(date) — sleeping 20 min ==="
  sleep 1200
done
