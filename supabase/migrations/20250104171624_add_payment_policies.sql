-- Drop existing policies
drop policy if exists "Users can view their own orders" on orders;
drop policy if exists "Users can create orders" on orders;
drop policy if exists "Users can update payment status of their own orders" on orders;
drop policy if exists "Suppliers can update status of their orders" on orders;

-- Enable RLS
alter table orders enable row level security;

-- Allow users to read their own orders
create policy "Users can view their own orders"
  on orders
  for select
  using (auth.uid() = user_id);

-- Allow users to create orders
create policy "Users can create orders"
  on orders
  for insert
  with check (auth.uid() = user_id);

-- Allow users to update payment status of their own orders
create policy "Users can update payment status of their own orders"
  on orders
  for update
  using (auth.uid() = user_id);

-- Allow suppliers to update status of their orders
create policy "Suppliers can update status of their orders"
  on orders
  for update
  using (auth.uid() = supplier_id);
