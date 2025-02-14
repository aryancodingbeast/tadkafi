-- Create publication if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

-- Drop table from publication if exists
do $$
begin
  if exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'orders'
  ) then
    alter publication supabase_realtime drop table orders;
  end if;
end $$;

-- Enable real-time for orders table
alter publication supabase_realtime add table orders;

-- Enable real-time for specific columns
comment on table orders is e'@realtime={"*":true}';

-- Add replica identity for real-time updates
alter table orders replica identity full;
