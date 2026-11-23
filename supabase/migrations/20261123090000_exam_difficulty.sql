-- Apply before syncing app versions with exam-level difficulty.
alter table public.study_plans add column difficulty integer not null default 3;

-- Preserve previous choices on every linked exam. Advance updated_at so the
-- newest-edit trigger accepts the backfill and phones download the new field.
update public.study_plans as plan
set difficulty = case when subject.difficulty between 1 and 5 then subject.difficulty else 3 end,
    updated_at = greatest(plan.updated_at + 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)
from public.subjects as subject
where subject.id = plan.subject_id and subject.user_id = plan.user_id;

alter table public.subjects drop column difficulty;
