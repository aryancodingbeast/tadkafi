-- Create cart_items table
create table public.cart_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, product_id)
);

-- Enable RLS
alter table public.cart_items enable row level security;

-- Policies for cart_items
create policy "Users can view their own cart items"
  on public.cart_items
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can add items to their cart"
  on public.cart_items
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their cart items"
  on public.cart_items
  for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their cart items"
  on public.cart_items
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Create index for better performance
create index idx_cart_items_user_id on public.cart_items(user_id);
