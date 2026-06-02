alter table jobs
add column if not exists match_score_5 int,
add column if not exists application_strategy jsonb,
add column if not exists worth_applying boolean,
add column if not exists recommendation_reason text;

create table if not exists job_application_package (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  resume_tailoring_suggestions jsonb default '[]',
  cover_letter text not null,
  salary_recommendation text not null,
  interview_questions jsonb default '[]',
  interview_answers jsonb default '[]',
  skills_to_emphasize jsonb default '[]',
  gaps_to_prepare jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists job_application_package_job_id_unique
on job_application_package(job_id);

create index if not exists jobs_score_5_idx on jobs(match_score_5 desc);

create index if not exists job_application_package_created_idx
on job_application_package(created_at desc);

alter table job_application_package enable row level security;
