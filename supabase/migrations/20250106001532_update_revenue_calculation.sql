-- Drop existing objects
drop trigger if exists on_stats_change on orders;
drop materialized view if exists supplier_order_stats cascade;
drop view if exists supplier_order_stats cascade;
drop function if exists refresh_supplier_stats() cascade;
drop function if exists manual_refresh_supplier_stats() cascade;

-- Create materialized view for supplier_order_stats
create materialized view supplier_order_stats as
select
  s.id as supplier_id,
  s.name as supplier_name,
  (select count(*) from products where supplier_id = s.id) as total_products,
  count(distinct o.id) filter (where o.status = 'pending') as pending_orders,
  count(distinct o.id) filter (where o.status = 'processing') as processing_orders,
  count(distinct o.id) filter (where o.status = 'completed') as completed_orders,
  count(distinct o.id) filter (where o.status = 'cancelled') as cancelled_orders,
  count(distinct o.id) as total_orders,
  coalesce(sum(o.total_amount) filter (where o.payment_status = 'completed'), 0) as total_revenue,
  coalesce(sum(o.total_amount) filter (where o.payment_status = 'pending'), 0) as pending_revenue,
  coalesce(sum(o.total_amount) filter (where o.payment_status = 'processing'), 0) as processing_revenue
from
  suppliers s
  left join orders o on s.id = o.supplier_id
group by
  s.id,
  s.name
with data;

-- Create unique index for faster refreshes
create unique index supplier_order_stats_supplier_id_idx on supplier_order_stats(supplier_id);

-- Function to manually refresh stats
create or replace function manual_refresh_supplier_stats()
returns void as $$
begin
  refresh materialized view supplier_order_stats;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant select on supplier_order_stats to authenticated;
grant execute on function manual_refresh_supplier_stats() to authenticated;
