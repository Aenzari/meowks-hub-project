# Meowks — Engineering Foundation

This repository contains the Meowks React + TypeScript + Vite starter and initial Supabase development foundation.

## Run in GitHub Codespaces
```bash
npm install
cp .env.example .env.local
npm run dev
```

The app includes Supabase email/password registration, login, logout, persistent sessions, and first-time display-name onboarding. Phase 2 adds private course CRUD, task/assignment/exam/reading/event CRUD, task completion tracking, and a live dashboard backed by the signed-in user's Supabase records. Phase 3.1 adds private study notes, flashcard decks/cards with flip-through practice, and a focus timer that records completed study sessions. Phase 3.2 adds private multiple-choice practice quizzes with database-scored attempts and answer review, spaced-repetition scheduling for flashcards, and a learning progress snapshot. Create a Supabase project, run `supabase/migrations/202611050001_initial_foundation.sql` in the SQL Editor, then run `supabase/migrations/202611050002_course_owner_delete.sql`, `supabase/migrations/202611050003_learning_foundation.sql`, `supabase/migrations/202611050004_learning_intelligence.sql`, and `supabase/seed.sql`. If the first migration has already been applied, run only the new `202611050002_course_owner_delete.sql` migration. Add the project URL and public anon/publishable key to `.env.local` (or Codespaces secrets/environment). Restart the Vite dev server after changing environment values. If email confirmation is enabled in Supabase Auth, new users must confirm their email before logging in.

Never commit `.env.local` or expose a Supabase service-role/secret key in browser code.

Test University is a fictional development tenant, not an institutional affiliation. Do not use real student data. Review and test the RLS policies before any pilot; this migration is a development baseline, not a production security audit.

## Commands
```bash
npm run dev
npm run build
npm run lint
```
