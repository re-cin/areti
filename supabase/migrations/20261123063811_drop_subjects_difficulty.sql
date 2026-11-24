-- Difficulty belongs to each exam (study_plans.difficulty), not to the subject.
-- study_plans.difficulty was first added by hand in the dashboard; this records it
-- (no-op if it is already there) and removes the old subject column.
alter table public.study_plans add column if not exists difficulty integer not null default 3;

alter table public.subjects drop column if exists difficulty;

notify pgrst, 'reload schema';
