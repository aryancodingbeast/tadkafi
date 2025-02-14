alter table products add column quantity integer not null default 0;

-- Update existing products to have some quantity
update products set quantity = 10;
