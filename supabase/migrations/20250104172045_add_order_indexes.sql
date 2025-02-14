-- Add indexes for better performance
create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_payment_status_idx on orders (payment_status);
create index if not exists orders_created_at_idx on orders (created_at desc);
