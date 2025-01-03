-- Drop existing policies if they exist
drop policy if exists "Allow users to view their own orders" on public.orders;
drop policy if exists "Allow users to create their own orders" on public.orders;
drop policy if exists "Allow users to update their own orders" on public.orders;
drop policy if exists "Allow users to view their order items" on public.order_items;
drop policy if exists "Allow users to create order items" on public.order_items;
drop policy if exists "Allow users to update their order items" on public.order_items;

-- Create order status enum
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'processing', 'completed', 'cancelled');
  end if;
end $$;

-- Drop and recreate orders table
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;

create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  status order_status default 'pending' not null,
  total_amount decimal(10,2) not null default 0,
  shipping_address jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create order_items table
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10,2) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on orders
alter table public.orders enable row level security;

-- Enable RLS on order_items
alter table public.order_items enable row level security;

-- Policies for orders table
create policy "Allow users to view their own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Allow users to create their own orders"
  on public.orders
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Allow users to update their own orders"
  on public.orders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policies for order_items table
create policy "Allow users to view their order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Allow users to create order items"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Allow users to update their order items"
  on public.order_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_id
      and orders.user_id = auth.uid()
    )
  );

-- Create function to update order total
create or replace function update_order_total()
returns trigger as $$
begin
  update public.orders
  set total_amount = (
    select coalesce(sum(quantity * unit_price), 0)
    from public.order_items
    where order_id = new.order_id
  )
  where id = new.order_id;
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers to update order total
drop trigger if exists update_order_total_on_item_insert on public.order_items;
create trigger update_order_total_on_item_insert
  after insert or update or delete
  on public.order_items
  for each row
  execute function update_order_total();

-- Create indexes for better performance
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);
