-- Drop existing tables and related objects
drop trigger if exists update_product_stock_after_order on order_items;
drop trigger if exists update_product_stock_on_status_change on orders;
drop trigger if exists validate_user_types_before_insert on orders;
drop trigger if exists validate_user_types_before_update on orders;
drop function if exists update_product_stock() cascade;
drop function if exists validate_order_user_types() cascade;
drop function if exists process_order_status() cascade;
drop policy if exists "Restaurants can view their own orders" on orders;
drop policy if exists "Restaurants can create their own orders" on orders;
drop policy if exists "Suppliers can view orders for their products" on orders;
drop policy if exists "Suppliers can update their order status" on orders;
drop policy if exists "Restaurants can view their order items" on order_items;
drop policy if exists "Restaurants can create their order items" on order_items;
drop policy if exists "Suppliers can view order items for their orders" on order_items;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists order_status_log cascade;

-- Create orders table
create table if not exists orders (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid references profiles(id) not null,
    supplier_id uuid references auth.users(id) on delete cascade not null,
    total_amount decimal(10,2) not null,
    shipping_address jsonb not null,
    status text not null default 'processing'::text check (status in ('processing', 'completed', 'cancelled')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    version integer default 1 not null
);

-- Create order items table
create table if not exists order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references orders(id) on delete cascade not null,
    product_id uuid references products(id) on delete cascade not null,
    quantity integer not null check (quantity > 0),
    unit_price decimal(10,2) not null check (unit_price >= 0),
    created_at timestamptz default now() not null
);

-- Create order status log table for audit
create table if not exists order_status_log (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references orders(id) on delete cascade not null,
    old_status text not null,
    new_status text not null,
    changed_by uuid references auth.users(id) not null,
    changed_at timestamptz default now() not null
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_log enable row level security;

-- Drop existing policies
drop policy if exists "Restaurants can view their own orders" on orders;
drop policy if exists "Restaurants can create their own orders" on orders;
drop policy if exists "Suppliers can view orders for their products" on orders;
drop policy if exists "Suppliers can update order status" on orders;
drop policy if exists "Restaurants can view their order items" on order_items;
drop policy if exists "Restaurants can create their order items" on order_items;
drop policy if exists "Suppliers can view order items for their orders" on order_items;

-- RLS Policies for orders
create policy "Users can view their own orders"
    on orders for select
    using (auth.uid() = restaurant_id or auth.uid() = supplier_id);

create policy "Restaurants can create orders"
    on orders for insert
    with check (auth.uid() = restaurant_id);

create policy "Suppliers can update their orders"
    on orders for update
    using (auth.uid() = supplier_id);

-- RLS Policies for order items
create policy "Users can view their order items"
    on order_items for select
    using (
        exists (
            select 1 from orders
            where orders.id = order_items.order_id
            and (orders.restaurant_id = auth.uid() or orders.supplier_id = auth.uid())
        )
    );

create policy "Restaurants can create order items"
    on order_items for insert
    with check (
        exists (
            select 1 from orders
            where orders.id = order_id
            and orders.restaurant_id = auth.uid()
        )
    );

-- Create view for supplier stats
create or replace view supplier_order_stats as
select 
    o.supplier_id,
    count(distinct o.id) as total_orders,
    count(distinct case when o.status = 'completed' then o.id end) as completed_orders,
    count(distinct case when o.status = 'processing' then o.id end) as processing_orders,
    count(distinct case when o.status = 'cancelled' then o.id end) as cancelled_orders,
    coalesce(sum(case when o.status in ('processing', 'completed') then o.total_amount else 0 end), 0) as total_revenue,
    coalesce(sum(case when o.status = 'completed' then o.total_amount else 0 end), 0) as completed_revenue
from orders o
group by o.supplier_id;

-- Grant access to the view
grant select on supplier_order_stats to authenticated;

-- Function to handle order creation with automatic stock update
create or replace function create_order(
    p_restaurant_id uuid,
    p_supplier_id uuid,
    p_total_amount decimal,
    p_shipping_address jsonb,
    p_items jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_order_id uuid;
    v_item jsonb;
begin
    -- First check stock for all items
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        if exists (
            select 1
            from products p
            where p.id = (v_item->>'product_id')::uuid
            and p.stock_quantity < (v_item->>'quantity')::integer
        ) then
            raise exception 'Insufficient stock for product %', (v_item->>'product_id')::uuid;
        end if;
    end loop;

    -- Create order with explicit status
    insert into orders (
        restaurant_id,
        supplier_id,
        total_amount,
        shipping_address,
        status
    ) values (
        p_restaurant_id,
        p_supplier_id,
        p_total_amount,
        p_shipping_address,
        'processing'::text
    ) returning id into v_order_id;

    -- Create order items and update stock
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        -- Insert order item
        insert into order_items (
            order_id,
            product_id,
            quantity,
            unit_price
        ) values (
            v_order_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::decimal
        );

        -- Update stock
        update products
        set stock_quantity = stock_quantity - (v_item->>'quantity')::integer
        where id = (v_item->>'product_id')::uuid;
    end loop;

    -- Log initial status
    insert into order_status_log (
        order_id,
        old_status,
        new_status,
        changed_by
    ) values (
        v_order_id,
        'processing'::text,
        'processing'::text,
        auth.uid()
    );

    return v_order_id;
end;
$$;

-- Drop the old function if it exists
drop function if exists update_order_status(uuid, text, integer);

-- Function to update order status
create or replace function supplier_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_supplier_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_current_status text;
  v_order_supplier_id uuid;
begin
  -- Get current status and supplier_id
  select status, supplier_id
  into v_current_status, v_order_supplier_id
  from orders
  where id = p_order_id;

  -- Check if order exists
  if v_current_status is null then
    raise exception 'Order not found';
  end if;

  -- Check if user is the supplier for this order
  if v_order_supplier_id != p_supplier_id then
    raise exception 'Not authorized to update this order';
  end if;

  -- Validate status transition
  if v_current_status = 'processing' and p_new_status in ('completed', 'cancelled') then
    -- Update the order status
    update orders
    set 
      status = p_new_status,
      updated_at = now()
    where id = p_order_id
    and supplier_id = p_supplier_id;

    -- Insert into order status log
    insert into order_status_log (
      order_id,
      old_status,
      new_status,
      changed_by
    ) values (
      p_order_id,
      v_current_status,
      p_new_status,
      p_supplier_id
    );

    return true;
  else
    raise exception 'Invalid status transition from % to %', v_current_status, p_new_status;
  end if;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function supplier_update_order_status to authenticated;

-- Function to update order status
create or replace function update_order_status(
    p_order_id uuid,
    p_new_status text,
    p_version integer
)
returns boolean
language plpgsql
security definer
as $$
declare
    v_current_status text;
    v_current_version integer;
    v_user_id uuid;
begin
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Lock the order row for update
    select status, version into v_current_status, v_current_version
    from orders
    where id = p_order_id
    for update;
    
    -- Check version for optimistic locking
    if v_current_version != p_version then
        return false;
    end if;

    -- Only allow cancellation or completion from processing
    if v_current_status != 'processing' or p_new_status not in ('completed', 'cancelled') then
        raise exception 'Invalid status transition from % to %', v_current_status, p_new_status;
    end if;

    -- If cancelling, restore stock
    if p_new_status = 'cancelled' then
        update products p
        set stock_quantity = p.stock_quantity + oi.quantity
        from order_items oi
        where oi.order_id = p_order_id
        and p.id = oi.product_id;
    end if;

    -- Update order status and version
    update orders
    set status = p_new_status,
        version = version + 1,
        updated_at = now()
    where id = p_order_id
    and version = p_version;

    -- Log status change
    insert into order_status_log (order_id, old_status, new_status, changed_by)
    values (p_order_id, v_current_status, p_new_status, v_user_id);

    return true;
end;
$$;

-- Insert test users if they don't exist
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select 
  'e96eceb5-8e84-4ec9-8d91-b60147822fb1',
  'test.restaurant@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.users where id = 'e96eceb5-8e84-4ec9-8d91-b60147822fb1'
);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select 
  'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc',
  'test.supplier@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
where not exists (
  select 1 from auth.users where id = 'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc'
);

-- Insert profiles for the test users
insert into profiles (id, type, business_name, contact_email)
select 
  'e96eceb5-8e84-4ec9-8d91-b60147822fb1',
  'restaurant',
  'Test Restaurant',
  'test.restaurant@example.com'
where not exists (
  select 1 from profiles where id = 'e96eceb5-8e84-4ec9-8d91-b60147822fb1'
);

insert into profiles (id, type, business_name, contact_email)
select 
  'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc',
  'supplier',
  'Test Supplier',
  'test.supplier@example.com'
where not exists (
  select 1 from profiles where id = 'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc'
);

-- Insert test data
insert into orders (
  id,
  restaurant_id,
  supplier_id,
  status,
  total_amount,
  shipping_address,
  created_at
) values (
  '12345678-1234-5678-1234-567812345678',
  'e96eceb5-8e84-4ec9-8d91-b60147822fb1', -- Restaurant ID
  'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc', -- Supplier ID
  'processing',
  1500.00,
  '{"street": "123 Test Street", "city": "Test City", "state": "Test State", "zip": "12345"}'::jsonb,
  now()
);

-- Insert test product if it doesn't exist
insert into products (
  id,
  name,
  description,
  price,
  unit,
  category,
  stock_quantity,
  supplier_id
) select
  gen_random_uuid(),
  'Test Product',
  'A test product',
  300.00,
  'kg',
  'Test Category',
  100,
  'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc'
where not exists (
  select 1 from products where supplier_id = 'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc'
);

insert into order_items (
  order_id,
  product_id,
  quantity,
  unit_price
) values (
  '12345678-1234-5678-1234-567812345678',
  (select id from products where supplier_id = 'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc' limit 1),
  5,
  300.00
);
