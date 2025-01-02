-- Drop existing policies if they exist
drop policy if exists "Allow public read access" on public.products;
drop policy if exists "Allow authenticated users to create products" on public.products;
drop policy if exists "Allow users to update their own products" on public.products;
drop policy if exists "Allow users to delete their own products" on public.products;

-- Create the products table if it doesn't exist
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add user_id column if it doesn't exist
do $$ 
begin
  if not exists (
    select from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'products' 
    and column_name = 'user_id'
  ) then
    alter table public.products 
    add column user_id uuid references auth.users(id) default auth.uid();
  end if;
end $$;

-- Add image_url column if it doesn't exist
do $$ 
begin
  if not exists (
    select from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'products' 
    and column_name = 'image_url'
  ) then
    alter table public.products 
    add column image_url text;
  end if;
end $$;

-- Enable RLS
alter table public.products enable row level security;

-- Create policies
create policy "Allow public read access"
  on public.products
  for select
  to public
  using (true);

create policy "Allow authenticated users to create products"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "Allow users to update their own products"
  on public.products
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Allow users to delete their own products"
  on public.products
  for delete
  to authenticated
  using (user_id = auth.uid());
