-- Drop existing constraints
alter table orders drop constraint if exists orders_payment_status_check;
alter table orders drop constraint if exists orders_payment_method_check;

-- Add constraints for payment status and method
alter table orders add constraint orders_payment_status_check 
  check (payment_status in ('pending', 'completed', 'failed', 'refunded'));

alter table orders add constraint orders_payment_method_check 
  check (payment_method = 'online');

-- Set default values
alter table orders 
  alter column payment_status set default 'pending',
  alter column payment_method set default 'online';
