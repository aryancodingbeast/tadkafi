-- Enable realtime for specific tables
-- Note: orders table already has RLS enabled from previous migration
alter table "public"."products" enable row level security;
alter table "public"."notifications" enable row level security;

-- Enable realtime for tables
alter publication supabase_realtime add table "public"."products";
alter publication supabase_realtime add table "public"."orders";
alter publication supabase_realtime add table "public"."notifications";

-- Add RLS policies for realtime
-- Products table
create policy "Enable read access for authenticated users"
on "public"."products"
for select
to authenticated
using (true);

create policy "Enable suppliers to insert their own products"
on "public"."products"
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Enable suppliers to update their own products"
on "public"."products"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Enable suppliers to delete their own products"
on "public"."products"
for delete
to authenticated
using (auth.uid() = user_id);

-- Notifications table
create policy "Enable users to read their own notifications"
on "public"."notifications"
for select
to authenticated
using (auth.uid() = user_id);

create policy "Enable system to create notifications"
on "public"."notifications"
for insert
to authenticated
with check (true);  -- We'll control this through functions/triggers

create policy "Enable users to update their own notifications"
on "public"."notifications"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Modify existing order change trigger to handle notifications
create or replace function notify_order_changes()
returns trigger as $$
declare
    v_debug_info jsonb;
begin
    -- Create notification for status change
    if NEW.status <> OLD.status then
        insert into notifications (
            user_id,
            title,
            message,
            type,
            reference_id,
            reference_type
        )
        values (
            case 
                when NEW.status in ('accepted', 'rejected', 'completed') then NEW.user_id  -- Notify restaurant
                else NEW.supplier_id  -- Notify supplier
            end,
            case 
                when NEW.status = 'pending' then 'New Order Received'
                when NEW.status = 'accepted' then 'Order Accepted'
                when NEW.status = 'rejected' then 'Order Rejected'
                when NEW.status = 'processing' then 'Order Processing'
                when NEW.status = 'completed' then 'Order Completed'
                else 'Order Status Updated'
            end,
            case 
                when NEW.status = 'pending' then 'You have received a new order'
                when NEW.status = 'accepted' then 'Your order has been accepted'
                when NEW.status = 'rejected' then 'Your order has been rejected'
                when NEW.status = 'processing' then 'Your order is being processed'
                when NEW.status = 'completed' then 'Your order has been completed'
                else 'Your order status has been updated to ' || NEW.status
            end,
            'order_status',
            NEW.id,
            'orders'
        );
    end if;

    -- Refresh supplier stats
    if TG_OP = 'UPDATE' and (
        NEW.status <> OLD.status or
        NEW.payment_status <> OLD.payment_status or
        NEW.total_amount <> OLD.total_amount
    ) then
        perform manual_refresh_supplier_stats();
    end if;

    return NEW;
end;
$$ language plpgsql security definer;

-- Replication for realtime
comment on table "public"."products" is '@graphql({"realtimeEnabled": true})';
comment on table "public"."orders" is '@graphql({"realtimeEnabled": true})';
comment on table "public"."notifications" is '@graphql({"realtimeEnabled": true})';
