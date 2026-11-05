# Meowks — Engineering Foundation

This repository contains the Meowks React + TypeScript + Vite starter and initial Supabase development foundation.

## Run in GitHub Codespaces
```bash
npm install
cp .env.example .env.local
npm run dev
```

The frontend currently uses demo data until authentication and feature screens are wired to Supabase. Create a Supabase project, run `supabase/migrations/202611050001_initial_foundation.sql`, then `supabase/seed.sql`, and add the project URL and public anon/publishable key to `.env.local`.

Never commit `.env.local` or expose a Supabase service-role/secret key in browser code.

Test University is a fictional development tenant, not an institutional affiliation. Do not use real student data. Review and test the RLS policies before any pilot; this migration is a development baseline, not a production security audit.

## Commands
```bash
npm run dev
npm run build
npm run lint
```
