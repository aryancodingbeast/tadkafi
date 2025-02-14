-- Drop existing tables if they exist
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists order_status_log cascade;
drop table if exists suppliers cascade;
drop function if exists get_user_data cascade;
drop type if exists order_status cascade;

-- Create enum type for order status if it doesn't exist
create type order_status as enum ('pending', 'processing', 'cancelled', 'completed');

-- Function to check and create supplier if not exists
create or replace function ensure_supplier_exists(p_supplier_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
    v_exists boolean;
begin
    -- Check if supplier exists
    select exists(
        select 1 
        from suppliers 
        where id = p_supplier_id
    ) into v_exists;

    if not v_exists then
        -- Check if user exists in auth.users
        if not exists(
            select 1 
            from auth.users 
            where id = p_supplier_id
        ) then
            raise exception 'User does not exist in auth.users';
        end if;

        -- Create supplier
        insert into suppliers (id, name)
        values (p_supplier_id, 'Unknown Supplier')
        on conflict (id) do nothing;
    end if;

    return p_supplier_id;
end;
$$;

-- Grant execute permission on the function
grant execute on function ensure_supplier_exists to authenticated;

-- Create suppliers table
create table if not exists suppliers (
  id uuid primary key references auth.users(id),
  name text not null default 'Unknown Supplier',
  description text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on suppliers table
alter table suppliers enable row level security;

-- Policy for anyone to view suppliers
create policy "Anyone can view suppliers"
  on suppliers for select
  using (true);

-- Policy for anyone to create suppliers
create policy "Anyone can create suppliers"
  on suppliers for insert
  with check (true);

-- Policy for users to update their own supplier profile
create policy "Users can update their own supplier profile"
  on suppliers for update
  using (auth.uid() = id);

-- Create orders table
create table if not exists orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id),
  supplier_id uuid not null references suppliers(id),
  total_amount decimal not null,
  shipping_address jsonb not null,
  status order_status not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text not null default 'online',
  version integer not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint ensure_supplier_exists_check check (supplier_id = ensure_supplier_exists(supplier_id))
);

-- Drop existing policies
drop policy if exists "Users can view their own orders" on orders;
drop policy if exists "Users can create their own orders" on orders;
drop policy if exists "Users can update payment status" on orders;
drop policy if exists "Suppliers can update order status" on orders;

-- Enable RLS
alter table orders enable row level security;

-- Create all policies
create policy "Users can view their own orders"
  on orders for select
  to authenticated
  using (
    auth.uid() = user_id or 
    auth.uid() in (
      select id from suppliers where id = supplier_id
    )
  );

create policy "Users can create their own orders"
  on orders for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update payment status"
  on orders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and
    payment_status is not null
  );

create policy "Suppliers can update order status"
  on orders for update
  to authenticated
  using (auth.uid() in (select id from suppliers where id = supplier_id))
  with check (
    auth.uid() in (select id from suppliers where id = supplier_id) and
    status is not null
  );

-- Enable realtime
alter table orders replica identity full;

-- Create notification function
create or replace function notify_order_changes()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE') then
    if (NEW.status is distinct from OLD.status or NEW.payment_status is distinct from OLD.payment_status) then
      perform pg_notify(
        'order_status_change',
        json_build_object(
          'id', NEW.id,
          'status', NEW.status,
          'payment_status', NEW.payment_status,
          'user_id', NEW.user_id,
          'supplier_id', NEW.supplier_id
        )::text
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists on_order_change on orders;
create trigger on_order_change
  after update on orders
  for each row
  execute function notify_order_changes();

-- Create order items table
create table if not exists order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid not null references orders(id),
  product_id uuid not null references products(id),
  quantity integer not null,
  price_per_unit decimal not null,
  total_price decimal not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on order_items table
alter table order_items enable row level security;

-- Policy for users to view their order items
create policy "Users can view their order items"
  on order_items for select
  using (
    order_id in (
      select id from orders where user_id = auth.uid()
    )
  );

-- Policy for suppliers to view their order items
create policy "Suppliers can view their order items"
  on order_items for select
  using (
    order_id in (
      select id from orders where supplier_id = auth.uid()
    )
  );

-- Policy for users to create order items
create policy "Users can create order items with their orders"
  on order_items for insert
  with check (
    order_id in (
      select id from orders where user_id = auth.uid()
    )
  );

-- Create order status log table
create table if not exists order_status_log (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid not null references orders(id),
  old_status order_status not null,
  new_status order_status not null,
  changed_by uuid not null references auth.users(id),
  created_at timestamp with time zone default now()
);

-- Enable RLS on order_status_log table
alter table order_status_log enable row level security;

-- Policy for users to view their order status logs
create policy "Users can view their order status logs"
  on order_status_log for select
  using (
    order_id in (
      select id from orders where user_id = auth.uid()
    )
  );

-- Policy for suppliers to view their order status logs
create policy "Suppliers can view their order status logs"
  on order_status_log for select
  using (
    order_id in (
      select id from orders where supplier_id = auth.uid()
    )
  );

-- Policy for users and suppliers to create status logs
create policy "Users and suppliers can create status logs"
  on order_status_log for insert
  with check (
    order_id in (
      select id from orders where 
        user_id = auth.uid() or 
        supplier_id = auth.uid()
    )
  );

-- Drop existing trigger if exists
drop trigger if exists order_notification_trigger on orders;

-- Create notification table for order confirmations
drop table if exists supplier_notifications cascade;
create table if not exists supplier_notifications (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id),
  order_id uuid not null references orders(id),
  status text not null default 'pending',
  seen boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint supplier_notifications_status_check check (status in ('pending', 'accepted', 'rejected'))
);

-- Enable realtime for supplier_notifications table
alter publication supabase_realtime add table supplier_notifications;

-- Enable RLS on notifications table
alter table supplier_notifications enable row level security;

-- Policy for suppliers to view their notifications
create policy "Suppliers can view their own notifications"
  on supplier_notifications for select
  using (auth.uid() = supplier_id);

-- Policy for suppliers to update their notifications
create policy "Suppliers can update their own notifications"
  on supplier_notifications for update
  using (auth.uid() = supplier_id);

-- Function to create notification when order is placed
create or replace function create_supplier_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_supplier_exists boolean;
  v_debug_info jsonb;
  v_notification_id uuid;
begin
  -- Create debug info
  v_debug_info := jsonb_build_object(
    'order_id', NEW.id,
    'supplier_id', NEW.supplier_id,
    'status', NEW.status,
    'trigger_name', TG_NAME,
    'trigger_when', TG_WHEN,
    'trigger_level', TG_LEVEL,
    'trigger_op', TG_OP
  );
  
  raise notice 'Creating notification with debug info: %', v_debug_info;

  -- Check if supplier exists
  select exists(
    select 1 
    from suppliers 
    where id = NEW.supplier_id
  ) into v_supplier_exists;

  if not v_supplier_exists then
    raise notice 'Supplier % does not exist', NEW.supplier_id;
    raise exception 'Supplier does not exist';
  end if;

  raise notice 'Supplier % exists, creating notification', NEW.supplier_id;

  -- Create notification for supplier
  insert into supplier_notifications (supplier_id, order_id, status)
  values (NEW.supplier_id, NEW.id, 'pending')
  returning id into v_notification_id;

  raise notice 'Created notification with ID: %', v_notification_id;
  
  return NEW;
exception when others then
  raise notice 'Error in create_supplier_notification: % %', SQLERRM, SQLSTATE;
  return NEW;
end;
$$;

-- Create trigger to create notification when order is placed
drop trigger if exists create_supplier_notification_trigger on orders;
create trigger create_supplier_notification_trigger
  after insert
  on orders
  for each row
  execute function create_supplier_notification();

-- Function to update order status when notification is updated
create or replace function update_order_status()
returns trigger
language plpgsql
security definer
as $$
declare
  v_order_status order_status;
  v_debug_info jsonb;
begin
  -- Create debug info
  v_debug_info := jsonb_build_object(
    'notification_id', NEW.id,
    'order_id', NEW.order_id,
    'old_status', OLD.status,
    'new_status', NEW.status
  );
  
  raise notice 'Updating order status with debug info: %', v_debug_info;

  -- Map notification status to order status
  case NEW.status
    when 'accepted' then
      v_order_status := 'processing'::order_status;
    when 'rejected' then
      v_order_status := 'cancelled'::order_status;
    else
      return NEW;
  end case;

  raise notice 'Mapped notification status % to order status %', NEW.status, v_order_status;

  -- Update order status
  update orders
  set status = v_order_status,
      updated_at = now()
  where id = NEW.order_id;

  raise notice 'Updated order % status to %', NEW.order_id, v_order_status;

  return NEW;
exception when others then
  raise notice 'Error in update_order_status: % %', SQLERRM, SQLSTATE;
  return NEW;
end;
$$;

-- Create trigger to update order status when notification is updated
drop trigger if exists update_order_status_trigger on supplier_notifications;
create trigger update_order_status_trigger
  after update of status
  on supplier_notifications
  for each row
  when (OLD.status <> NEW.status)
  execute function update_order_status();

-- Function to handle order creation with automatic stock update
create or replace function create_order(
    p_user_id uuid,
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
        user_id,
        supplier_id,
        total_amount,
        shipping_address,
        status
    ) values (
        p_user_id,
        p_supplier_id,
        p_total_amount,
        p_shipping_address,
        'pending'::order_status
    ) returning id into v_order_id;

    -- Create order items and update stock
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        -- Insert order item
        insert into order_items (
            order_id,
            product_id,
            quantity,
            price_per_unit,
            total_price
        ) values (
            v_order_id,
            (v_item->>'product_id')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'unit_price')::decimal,
            (v_item->>'quantity')::integer * (v_item->>'unit_price')::decimal
        );

        -- Update stock
        update products
        set stock_quantity = stock_quantity - (v_item->>'quantity')::integer
        where id = (v_item->>'product_id')::uuid;
    end loop;

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
    v_user_id uuid;
    v_current_status text;
    v_current_version integer;
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

    -- Define valid status transitions
    if (v_current_status = 'pending' and p_new_status not in ('processing', 'cancelled')) or
       (v_current_status = 'processing' and p_new_status not in ('pending', 'cancelled')) then
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

-- Update supplier_order_stats view
create or replace view supplier_order_stats as
select
  s.id as supplier_id,
  s.name as supplier_name,
  (select count(*) from products where supplier_id = s.id) as total_products,
  count(distinct o.id) filter (where o.status = 'pending') as pending_orders,
  count(distinct o.id) filter (where o.status = 'processing') as processing_orders,
  count(distinct o.id) filter (where o.status = 'completed') as completed_orders,
  count(distinct o.id) filter (where o.status = 'cancelled') as cancelled_orders,
  count(distinct o.id) as total_orders,
  coalesce(sum(o.total_amount) filter (where o.status = 'completed' and o.payment_status = 'completed'), 0) as total_revenue
from
  suppliers s
  left join orders o on s.id = o.supplier_id
group by
  s.id,
  s.name;

-- Grant access to the view and enable realtime
grant select on supplier_order_stats to authenticated;
alter publication supabase_realtime add table orders;

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
  user_id,
  supplier_id,
  status,
  total_amount,
  shipping_address,
  created_at
) values (
  '12345678-1234-5678-1234-567812345678',
  'e96eceb5-8e84-4ec9-8d91-b60147822fb1', -- User ID
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
  price_per_unit,
  total_price
) values (
  '12345678-1234-5678-1234-567812345678',
  (select id from products where supplier_id = 'f0a6ed8b-07f9-4179-9d88-c6d99c6c0cdc' limit 1),
  5,
  300.00,
  1500.00
);
