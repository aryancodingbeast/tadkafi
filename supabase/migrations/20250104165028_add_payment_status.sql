-- Add payment_status to orders table
alter table orders add column if not exists payment_status text check (payment_status in ('pending', 'completed', 'failed')) default 'pending';

-- Drop existing triggers and functions
drop trigger if exists update_order_status_trigger on supplier_notifications;
drop trigger if exists handle_order_cancellation_trigger on orders;
drop function if exists handle_supplier_notification();
drop function if exists handle_order_cancellation();
drop view if exists supplier_order_stats;

-- Create function to handle supplier notifications
create or replace function handle_supplier_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
begin
  -- Get the order details
  select * into v_order
  from orders
  where id = NEW.order_id;

  if not found then
    raise exception 'Order not found: %', NEW.order_id;
  end if;

  -- Handle different notification statuses
  case NEW.status
    when 'accepted' then
      -- Update order status to processing but don't update revenue yet
      update orders
      set status = 'processing'::order_status,
          updated_at = now()
      where id = NEW.order_id;

    when 'rejected' then
      -- Update order status to cancelled
      update orders
      set status = 'cancelled'::order_status,
          updated_at = now()
      where id = NEW.order_id;
  end case;

  return NEW;
end;
$$;

-- Create function to handle payment completion
create or replace function handle_payment_completion()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only handle transitions to completed payment status
  if NEW.payment_status = 'completed' and OLD.payment_status = 'pending' then
    -- Only update revenue if order is in processing status
    if NEW.status = 'processing' then
      -- Update supplier revenue
      update suppliers
      set revenue = revenue + NEW.total_amount
      where id = NEW.supplier_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Create function to handle order cancellations
create or replace function handle_order_cancellation()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only handle transitions from processing to cancelled
  if NEW.status = 'cancelled' and OLD.status = 'processing' then
    -- Only reduce revenue if payment was completed
    if NEW.payment_status = 'completed' then
      -- Reduce supplier revenue
      update suppliers
      set revenue = revenue - OLD.total_amount
      where id = OLD.supplier_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Create triggers
create trigger handle_supplier_notification_trigger
  after update of status
  on supplier_notifications
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function handle_supplier_notification();

create trigger handle_payment_completion_trigger
  before update of payment_status
  on orders
  for each row
  when (OLD.payment_status is distinct from NEW.payment_status)
  execute function handle_payment_completion();

create trigger handle_order_cancellation_trigger
  before update of status
  on orders
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function handle_order_cancellation();

-- Create view for supplier order stats with payment status
create or replace view supplier_order_stats as
with order_counts as (
  select
    supplier_id,
    count(*) filter (where status = 'pending') as pending_orders,
    count(*) filter (where status = 'processing') as processing_orders,
    count(*) filter (where status = 'cancelled') as cancelled_orders,
    count(*) as total_orders
  from orders
  group by supplier_id
),
order_revenue as (
  select
    o.supplier_id,
    sum(o.total_amount) filter (
      where o.status = 'processing' 
      and o.payment_status = 'completed'
    ) as total_revenue
  from orders o
  group by o.supplier_id
)
select
  s.id as supplier_id,
  s.name as supplier_name,
  coalesce(oc.pending_orders, 0) as pending_orders,
  coalesce(oc.processing_orders, 0) as processing_orders,
  coalesce(oc.cancelled_orders, 0) as cancelled_orders,
  coalesce(oc.total_orders, 0) as total_orders,
  coalesce(rev.total_revenue, 0) as total_revenue
from suppliers s
left join order_counts oc on s.id = oc.supplier_id
left join order_revenue rev on s.id = rev.supplier_id;

-- Grant access to the view
grant select on supplier_order_stats to authenticated;
