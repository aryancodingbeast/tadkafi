-- Add category column if it doesn't exist
do $$ 
begin
  if not exists (
    select from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'products' 
    and column_name = 'category'
  ) then
    alter table public.products 
    add column category text;
  end if;
end $$;
