-- First, drop all existing functions and triggers
drop trigger if exists update_order_status_trigger on supplier_notifications;
drop trigger if exists handle_order_cancellation_trigger on orders;
drop trigger if exists handle_notification_status_change on supplier_notifications;
drop trigger if exists handle_order_status_change on orders;
drop function if exists update_order_status(uuid, text, integer);
drop function if exists update_order_status();
drop function if exists handle_order_cancellation();
drop function if exists handle_order_status_change();

-- First, reset all supplier revenues to 0
update suppliers set revenue = 0;

-- Recalculate revenue only from accepted orders (status = 'processing')
update suppliers s
set revenue = (
  select coalesce(sum(o.total_amount), 0)
  from orders o
  where o.supplier_id = s.id
  and o.status = 'processing'
);

-- Create a single function to handle all revenue changes
create or replace function handle_order_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_order orders%rowtype;
begin
  if TG_TABLE_NAME = 'supplier_notifications' then
    -- For supplier notifications, get order details using order_id from notification
    select * into v_order
    from orders
    where id = NEW.order_id;

    if not found then
      raise exception 'Order not found for notification %', NEW.id;
    end if;

    -- For supplier notifications (order acceptance/rejection)
    if NEW.status = 'accepted' then
      -- Add revenue when order is accepted
      update suppliers
      set revenue = revenue + v_order.total_amount
      where id = v_order.supplier_id;
      
      -- Update order status to processing
      update orders
      set status = 'processing'::order_status,
          updated_at = now()
      where id = v_order.id;
      
    elsif NEW.status = 'rejected' then
      -- Update order status to cancelled (no revenue change needed)
      update orders
      set status = 'cancelled'::order_status,
          updated_at = now()
      where id = v_order.id;
    end if;
    
  elsif TG_TABLE_NAME = 'orders' then
    -- For orders table, we already have the order in NEW
    v_order := NEW;
    
    -- For order status changes
    if NEW.status = 'cancelled' and OLD.status = 'processing' then
      -- Remove revenue when processing order is cancelled
      update suppliers
      set revenue = revenue - v_order.total_amount
      where id = v_order.supplier_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Create triggers for both tables
create trigger handle_notification_status_change
  after update of status
  on supplier_notifications
  for each row
  when (OLD.status <> NEW.status)
  execute function handle_order_status_change();

create trigger handle_order_status_change
  after update of status
  on orders
  for each row
  when (OLD.status <> NEW.status)
  execute function handle_order_status_change();
