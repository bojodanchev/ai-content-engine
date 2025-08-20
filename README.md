# AI Content Engine

Next.js app with Whop auth, video upload, metadata editing (FFmpeg), SQLite job history, and downloads.

## Local Dev

- Node 22 is recommended (`.nvmrc` provided).
- Create `.env.development.local`:

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
WHOP_API_KEY=...
NEXT_PUBLIC_WHOP_APP_ID=...
NEXT_PUBLIC_WHOP_AGENT_USER_ID=...
NEXT_PUBLIC_WHOP_COMPANY_ID=...
```

- Install and run:

```
npm i
npm run dev
```

## Deploy (Vercel)

- Push to GitHub, import repo in Vercel, set the env vars (and optionally `DATA_DIR=/tmp/ace-storage`).
- Vercel build command: `next build`; output: default.

