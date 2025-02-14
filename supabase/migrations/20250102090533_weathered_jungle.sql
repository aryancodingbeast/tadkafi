/*
  # Initial Database Schema

  1. Tables
    - profiles
      - id (uuid, references auth.users)
      - type (enum: restaurant, supplier)
      - business_name (text)
      - contact_email (text)
      - phone (text)
      - address (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - products
      - id (uuid)
      - supplier_id (uuid, references profiles)
      - name (text)
      - description (text)
      - price (decimal)
      - unit (text)
      - stock_quantity (integer)
      - category (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - orders
      - id (uuid)
      - restaurant_id (uuid, references profiles)
      - supplier_id (uuid, references profiles)
      - status (enum: pending, confirmed, processing, shipped, delivered, cancelled)
      - total_amount (decimal)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - order_items
      - id (uuid)
      - order_id (uuid, references orders)
      - product_id (uuid, references products)
      - quantity (integer)
      - unit_price (decimal)
      - total_price (decimal)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access control
*/

-- Create custom types
CREATE TYPE user_type AS ENUM ('restaurant', 'supplier');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  type user_type NOT NULL,
  business_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  unit text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES profiles(id) NOT NULL,
  supplier_id uuid REFERENCES profiles(id) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Suppliers can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = supplier_id);

-- Orders policies
CREATE POLICY "Restaurants can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = restaurant_id);

CREATE POLICY "Suppliers can view orders assigned to them"
  ON orders FOR SELECT
  USING (auth.uid() = supplier_id);

CREATE POLICY "Restaurants can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Suppliers can update their assigned orders"
  ON orders FOR UPDATE
  USING (auth.uid() = supplier_id);

-- Order items policies
CREATE POLICY "Users can view their related order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.restaurant_id = auth.uid() OR orders.supplier_id = auth.uid())
    )
  );

CREATE POLICY "Restaurants can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.restaurant_id = auth.uid()
    )
  );