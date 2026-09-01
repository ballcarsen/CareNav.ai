# CareNav.ai

A voice-based, non-clinical care navigator for patients and their family members/caregivers. Built with Next.js, deployed on Vercel, using Vapi for the voice agent and Supabase for auth + persisted conversation tracking.

## Setup

1. `npm install`
2. Create a Supabase project, then run `supabase/migrations/0001_init.sql` against it (via the SQL editor, or `supabase db push` if using the CLI).
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project's API settings.
   - `NEXT_PUBLIC_VAPI_PUBLIC_KEY` from the Vapi dashboard.
   - `VAPI_WEBHOOK_SECRET`: a secret you generate yourself.
4. In the Vapi dashboard, go to Integrations -> Server Configuration and create a Bearer Token credential whose value matches `VAPI_WEBHOOK_SECRET`. Set it as the account's Server URL auth, and set the Server URL itself to `https://<your-domain>/api/vapi/webhook` (use an `ngrok http 3000` tunnel URL for local dev, since Vapi's servers can't reach `localhost`).
5. `npm run dev` and open http://localhost:3000.

## How persistence works

A conversation row is created client-side the moment a call starts, and finalized server-side by `/api/vapi/webhook` when Vapi sends the `end-of-call-report` event — so a closed browser tab never loses a transcript. See `lib/vapi/assistant-config.ts` for the care navigator persona.
