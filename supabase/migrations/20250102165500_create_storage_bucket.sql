-- Create a storage bucket for product images
insert into storage.buckets (id, name, public)
values ('products', 'products', true);

-- Set up storage policy to allow authenticated users to upload
create policy "Allow authenticated users to upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'products' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own images
create policy "Allow authenticated users to update their own images"
on storage.objects for update to authenticated
using (
  bucket_id = 'products' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own images
create policy "Allow authenticated users to delete their own images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'products' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view product images
create policy "Allow public to view product images"
on storage.objects for select to public
using (bucket_id = 'products');
