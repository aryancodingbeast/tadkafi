-- Insert sample products
INSERT INTO products (id, supplier_id, name, description, price, unit, stock_quantity, category)
VALUES 
  (gen_random_uuid(), 'f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'Basmati Rice', 'Premium long-grain basmati rice', 120.00, 'kg', 100, 'grains'),
  (gen_random_uuid(), 'f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'Whole Wheat Flour', 'Organic whole wheat flour', 60.00, 'kg', 150, 'grains'),
  (gen_random_uuid(), 'f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'Olive Oil', 'Extra virgin olive oil', 750.00, 'liter', 50, 'oils'),
  (gen_random_uuid(), 'f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'Black Pepper', 'Freshly ground black pepper', 180.00, '100g', 75, 'spices'),
  (gen_random_uuid(), 'f93699b5-5f8c-4538-a180-2dbdc82e2c9d', 'Tomato Sauce', 'Italian-style tomato sauce', 95.00, 'can', 200, 'sauces');
