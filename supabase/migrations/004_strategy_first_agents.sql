alter table jobs
add column if not exists application_strategy jsonb;

alter table job_application_package
add column if not exists resume_tailoring_suggestions jsonb default '[]';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'job_application_package'
      and column_name = 'tailored_resume_text'
  ) then
    alter table job_application_package alter column tailored_resume_text drop not null;
  end if;
end $$;
