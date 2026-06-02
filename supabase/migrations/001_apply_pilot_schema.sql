create extension if not exists pgcrypto;

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),

  source_type text not null default 'manual',
  source_url text,
  title text,
  company text,
  location text,
  remote_type text,

  description text not null,

  posted_date date,
  fetched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  match_score int,
  match_score_5 int,
  match_tier text,
  match_summary text,
  match_data jsonb,
  application_strategy jsonb,
  worth_applying boolean,
  recommendation_reason text,

  cover_letter text,

  status text default 'new',

  notes text,
  application_date date,
  deadline date,
  contact_person text,
  contact_email text,
  salary_range text,
  work_model text
);

alter table jobs
add column if not exists match_score_5 int,
add column if not exists application_strategy jsonb,
add column if not exists worth_applying boolean,
add column if not exists recommendation_reason text;

create unique index if not exists jobs_source_url_unique
on jobs(source_url)
where source_url is not null;

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_score_idx on jobs(match_score desc);
create index if not exists jobs_score_5_idx on jobs(match_score_5 desc);
create index if not exists jobs_created_idx on jobs(created_at desc);
create index if not exists jobs_company_idx on jobs(company);

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

alter table job_application_package
add column if not exists resume_tailoring_suggestions jsonb default '[]';

create unique index if not exists job_application_package_job_id_unique
on job_application_package(job_id);

create index if not exists job_application_package_created_idx
on job_application_package(created_at desc);

create table if not exists profile (
  id int primary key default 1,

  name text,
  email text,

  resume_text text,
  candidate_profile_summary jsonb,
  resume_filename text,
  resume_storage_path text,

  preferred_roles jsonb default '[]',
  excluded_companies jsonb default '[]',
  excluded_keywords jsonb default '[]',

  cover_letter_threshold int default 60,
  dashboard_min_score int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into profile (id) values (1) on conflict do nothing;

alter table jobs enable row level security;
alter table job_application_package enable row level security;
alter table profile enable row level security;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
