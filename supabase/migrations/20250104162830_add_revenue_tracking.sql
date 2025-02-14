-- Add revenue column to suppliers table
alter table suppliers add column if not exists revenue decimal default 0;

-- Drop existing trigger if it exists
drop trigger if exists update_order_status_trigger on supplier_notifications;
drop function if exists update_order_status();

-- Updated function to handle revenue tracking
create or replace function update_order_status()
returns trigger
language plpgsql
security definer
as $$
declare
  v_order_status order_status;
  v_debug_info jsonb;
  v_order_amount decimal;
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
      
      -- Get order amount
      select total_amount into v_order_amount
      from orders
      where id = NEW.order_id;

      -- Update supplier revenue only when order is accepted
      update suppliers
      set revenue = revenue + v_order_amount
      where id = NEW.supplier_id;

      raise notice 'Updated supplier % revenue by adding %', NEW.supplier_id, v_order_amount;

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

-- Recreate the trigger
create trigger update_order_status_trigger
  after update of status
  on supplier_notifications
  for each row
  when (OLD.status <> NEW.status)
  execute function update_order_status();

-- Function to handle order cancellation and revenue adjustment
create or replace function handle_order_cancellation()
returns trigger
language plpgsql
security definer
as $$
declare
  v_supplier_id uuid;
  v_order_amount decimal;
begin
  -- Only handle transitions to cancelled state
  if NEW.status = 'cancelled' and OLD.status = 'processing' then
    -- Get supplier ID and order amount
    select supplier_id, total_amount 
    into v_supplier_id, v_order_amount
    from orders 
    where id = NEW.id;

    -- Subtract the amount from supplier's revenue
    update suppliers
    set revenue = revenue - v_order_amount
    where id = v_supplier_id;

    raise notice 'Reduced supplier % revenue by % due to order cancellation', v_supplier_id, v_order_amount;
  end if;

  return NEW;
end;
$$;

-- Create trigger for order cancellation
drop trigger if exists handle_order_cancellation_trigger on orders;
create trigger handle_order_cancellation_trigger
  after update of status
  on orders
  for each row
  execute function handle_order_cancellation();
