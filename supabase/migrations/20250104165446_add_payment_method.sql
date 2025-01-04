-- Add payment_method to orders table
alter table orders add column if not exists payment_method text check (payment_method in ('online', 'cod')) default 'online';

-- Update the view
drop view if exists supplier_order_stats;

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
