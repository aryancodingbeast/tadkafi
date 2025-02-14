-- Drop existing triggers and functions
drop trigger if exists handle_supplier_notification_trigger on supplier_notifications;
drop trigger if exists handle_order_cancellation_trigger on orders;
drop trigger if exists handle_payment_completion_trigger on orders;
drop function if exists handle_supplier_notification() cascade;
drop function if exists handle_order_cancellation() cascade;
drop function if exists handle_payment_completion() cascade;

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
      -- Update order status to processing and wait for payment
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
  -- Only handle transitions to cancelled status
  if NEW.status = 'cancelled' then
    -- If payment was completed, initiate refund
    if OLD.payment_status = 'completed' then
      -- Reduce supplier revenue
      update suppliers
      set revenue = revenue - OLD.total_amount
      where id = OLD.supplier_id;
      
      -- Mark payment as refunded
      NEW.payment_status := 'refunded';
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

-- Add refunded to payment status check
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check 
  check (payment_status in ('pending', 'completed', 'failed', 'refunded'));
