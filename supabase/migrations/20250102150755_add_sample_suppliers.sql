-- Insert sample suppliers
INSERT INTO profiles (id, type, business_name, contact_email, phone, address)
VALUES 
  ('f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'supplier', 'Spice Paradise Exports', 'info@spiceparadise.in', '+91 98765 43210', 'Shop No. 12, Khari Baoli Market, Old Delhi - 110006, Delhi'),
  (gen_random_uuid(), 'supplier', 'Krishna Organic Farms', 'sales@krishnaorganics.in', '+91 89456 12370', '42/3 Industrial Area Phase II, Chandigarh - 160002, Punjab'),
  (gen_random_uuid(), 'supplier', 'Royal South Indian Foods', 'orders@royalsouth.in', '+91 94832 15670', '23, Gandhi Bazaar Main Road, Basavanagudi, Bangalore - 560004, Karnataka'),
  (gen_random_uuid(), 'supplier', 'Mumbai Fresh Seafood', 'support@mumbaiseafood.in', '+91 99203 45678', 'Stall 45, Sassoon Dock Fish Market, Colaba, Mumbai - 400005, Maharashtra'),
  (gen_random_uuid(), 'supplier', 'Amrit Pure Dairy', 'contact@amritdairy.in', '+91 95673 28901', '78 GIDC Estate, Anand - 388001, Gujarat');
