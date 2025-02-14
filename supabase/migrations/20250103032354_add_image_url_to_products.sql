-- Add image_url column to products table
alter table public.products
add column if not exists image_url text;

-- Update existing products with a default image
update public.products
set image_url = 'https://placehold.co/400x400'
where image_url is null;
