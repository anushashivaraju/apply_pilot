alter table jobs
add column if not exists rejection_date date,
add column if not exists rejection_stage text,
add column if not exists rejection_reason text;

create index if not exists jobs_rejection_date_idx
on jobs(rejection_date desc)
where status = 'rejected';

create index if not exists jobs_rejection_stage_idx
on jobs(rejection_stage)
where status = 'rejected';
