alter table jobs
add column if not exists interviewing boolean not null default false;

create index if not exists jobs_interviewing_idx on jobs(interviewing);
