-- Meowks Phase 2: allow course owners to delete their own private courses.
-- Tasks referencing a deleted course are retained and become personal tasks
-- because tasks.course_id uses ON DELETE SET NULL.

begin;
create policy "creators delete own courses"
on public.courses for delete to authenticated
using (created_by = (select auth.uid()));
commit;
