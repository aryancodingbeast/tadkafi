-- Insert sample suppliers
INSERT INTO profiles (id, type, business_name, contact_email, phone, address)
VALUES 
  ('f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'supplier', 'Fresh Foods Supply Co.', 'fresh.foods@example.com', '+1-555-0123', '123 Market St, San Francisco, CA'),
  (gen_random_uuid(), 'supplier', 'Global Spice Traders', 'spices@globaltraders.com', '+1-555-0124', '456 Spice Lane, Chicago, IL'),
  (gen_random_uuid(), 'supplier', 'Organic Farms Direct', 'sales@organicfarms.com', '+1-555-0125', '789 Farm Road, Portland, OR'),
  (gen_random_uuid(), 'supplier', 'Premium Meats & Seafood', 'orders@premiummeats.com', '+1-555-0126', '321 Dock Street, Seattle, WA'),
  (gen_random_uuid(), 'supplier', 'Asian Ingredients Co.', 'info@asianingredients.com', '+1-555-0127', '567 Asian Market Blvd, Los Angeles, CA');
