#!/usr/bin/env bash
#
# Local development setup for Jason Daily Pulse.
#
# Pulls real environment variables from Vercel (so OpenAI / Resend / DATABASE_URL
# all work), installs dependencies, and starts the dev server. Run this from the
# repo root on your own machine, where outbound network is available.
#
#   ./scripts/setup-local.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

if [ ! -f .env.local ]; then
  if command -v vercel >/dev/null 2>&1; then
    echo "==> Pulling environment variables from Vercel into .env.local"
    echo "    (you'll be prompted to log in / link the project the first time)"
    vercel link
    vercel env pull .env.local
  else
    echo "==> Vercel CLI not found. Install it with 'npm i -g vercel' to pull keys,"
    echo "    or copy .env.example to .env.local and fill it in manually."
    cp .env.example .env.local
    echo "    Created .env.local from .env.example — edit it before continuing."
    exit 1
  fi
else
  echo "==> .env.local already exists, leaving it untouched"
fi

echo
echo "==> Setup complete. Useful commands:"
echo "      npm run db:migrate   # apply schema (CAUTION: targets DATABASE_URL)"
echo "      npm run db:seed      # load the source roster"
echo "      npm run dev          # start the app at http://localhost:3000"
echo
echo "Starting the dev server now..."
npm run dev
