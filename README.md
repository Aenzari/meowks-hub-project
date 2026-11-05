# Meowks — Engineering Foundation

This repository contains the Meowks React + TypeScript + Vite starter and initial Supabase development foundation.

## Run in GitHub Codespaces
```bash
npm install
cp .env.example .env.local
npm run dev
```

The app includes Supabase email/password registration, login, logout, persistent sessions, and first-time display-name onboarding. Phase 2 adds private course CRUD, task/assignment/exam/reading/event CRUD, task completion tracking, and a live dashboard backed by the signed-in user's Supabase records. Phase 3.1 adds private study notes, flashcard decks/cards with flip-through practice, and a focus timer that records completed study sessions. Phase 3.2 adds private multiple-choice practice quizzes with database-scored attempts and answer review, spaced-repetition scheduling for flashcards, and a learning progress snapshot. Phase 4.1 adds an authenticated community feed, post comments, and public study groups with join/leave membership. Phase 4.2 adds post reactions (like, love, helpful), user-submitted content reports for posts/comments, and hardened study-group RLS helpers to prevent cross-table policy recursion. Phase 4.3 adds a protected moderator-role registry and a moderator-only report review queue. Phase 4.4 adds editable student profiles, interest tags, profile visibility controls, and a searchable student directory. Create a Supabase project, run `supabase/migrations/202611050001_initial_foundation.sql` in the SQL Editor, then run `supabase/migrations/202611050002_course_owner_delete.sql`, `supabase/migrations/202611050003_learning_foundation.sql`, `supabase/migrations/202611050004_learning_intelligence.sql`, `supabase/migrations/202611050005_community_foundation.sql`, `supabase/migrations/202611050006_community_engagement.sql`, `supabase/migrations/202611050007_moderation_workflow.sql`, `supabase/migrations/202611050008_student_profiles.sql`, and `supabase/seed.sql`. If the first migration has already been applied, run only the new `202611050002_course_owner_delete.sql` migration. Add the project URL and public anon/publishable key to `.env.local` (or Codespaces secrets/environment). Restart the Vite dev server after changing environment values. If email confirmation is enabled in Supabase Auth, new users must confirm their email before logging in.

Never commit `.env.local` or expose a Supabase service-role/secret key in browser code.

Test University is a fictional development tenant, not an institutional affiliation. Do not use real student data. Review and test the RLS policies before any pilot; this migration is a development baseline, not a production security audit.

## Commands
```bash
npm run dev
npm run build
npm run lint
```


## Phase 4.3 — Community moderation setup

After applying `202611050007_moderation_workflow.sql`, grant moderator access manually in the Supabase SQL Editor. First find the intended account's UUID in Authentication → Users, then run:

```sql
insert into public.meowks_moderator_roles (user_id, role)
values ('REPLACE-WITH-AUTH-USER-UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

Do not expose moderator-role writes to the browser. The migration grants authenticated users access only to their own role record and restricts report updates to the `status` column. The Community screen now includes a moderator-only report queue for viewing reported post/comment content and reporter details, then marking reports as reviewing, resolved, or dismissed. This workflow updates report status only; it does not automatically hide or delete reported content. Assign moderator roles manually and test with a dedicated moderator account.

## Phase 4.4 — Student profiles

After the earlier migrations, run `supabase/migrations/202611050008_student_profiles.sql`. The migration adds profile bio, major/program, year of study, interest tags, and a private/community visibility setting. Signed-in users can discover only community-visible profiles; profile owners retain the existing ability to edit their own profile. University affiliation and verification remain protected and cannot be self-assigned from the client. The My profile workspace includes profile editing and a searchable student directory. Profile photos and university verification workflows are not included in this phase yet.
