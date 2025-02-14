-- Drop existing triggers and functions
drop trigger if exists update_order_status_trigger on supplier_notifications;
drop trigger if exists handle_order_cancellation_trigger on orders;
drop trigger if exists handle_notification_status_change on supplier_notifications;
drop trigger if exists handle_order_status_change on orders;
drop function if exists update_order_status(uuid, text, integer);
drop function if exists update_order_status();
drop function if exists handle_order_cancellation();
drop function if exists handle_order_status_change();

-- Reset all revenues to 0
update suppliers set revenue = 0;

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
      -- Update order status to processing
      update orders
      set status = 'processing'::order_status,
          updated_at = now()
      where id = NEW.order_id;

      -- Update supplier revenue
      update suppliers
      set revenue = revenue + v_order.total_amount
      where id = v_order.supplier_id;

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

-- Create function to handle order cancellations
create or replace function handle_order_cancellation()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only handle transitions from processing to cancelled
  if NEW.status = 'cancelled' and OLD.status = 'processing' then
    -- Reduce supplier revenue
    update suppliers
    set revenue = revenue - OLD.total_amount
    where id = OLD.supplier_id;
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

create trigger handle_order_cancellation_trigger
  before update of status
  on orders
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function handle_order_cancellation();
