-- First drop the view since it depends on these columns
drop view if exists supplier_order_stats;

-- Add payment columns if they don't exist
alter table orders add column if not exists payment_status text check (payment_status in ('pending', 'completed', 'failed')) default 'pending';
alter table orders add column if not exists payment_method text;

-- Drop existing payment method check
alter table orders drop constraint if exists orders_payment_method_check;

-- Update payment method column to only allow 'online'
alter table orders add constraint orders_payment_method_check check (payment_method = 'online');

-- Set default payment method to 'online'
alter table orders alter column payment_method set default 'online';

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
      where (o.status = 'processing' and o.payment_status = 'completed')
      or (o.status = 'processing' and o.payment_method = 'cod')
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
