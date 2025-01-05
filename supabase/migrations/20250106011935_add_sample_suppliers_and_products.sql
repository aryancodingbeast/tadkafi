-- Check and create necessary tables
DO $$
BEGIN
    -- Check if products table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        -- Create products table
        CREATE TABLE products (
            id uuid default uuid_generate_v4() primary key,
            name text not null,
            description text,
            price decimal not null,
            unit text not null,
            category text not null,
            image_url text,
            supplier_id uuid not null references suppliers(id),
            user_id uuid not null references auth.users(id),
            created_at timestamp with time zone default now(),
            updated_at timestamp with time zone default now(),
            UNIQUE(supplier_id, name)
        );

        -- Enable RLS
        ALTER TABLE products enable row level security;
    END IF;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'products'
        AND constraint_name = 'products_supplier_id_name_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_supplier_id_name_key UNIQUE (supplier_id, name);
    END IF;

    -- Check if quantity column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE products ADD COLUMN quantity integer not null default 0;
    END IF;

    -- Check if suppliers table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        RAISE EXCEPTION 'Suppliers table does not exist. Please run the initial migration first.';
    END IF;
END $$;

-- Create sample suppliers with Indian names
DO $$
DECLARE
    supplier_ids uuid[] := ARRAY[
        uuid('11111111-1111-1111-1111-111111111111'),
        uuid('22222222-2222-2222-2222-222222222222'),
        uuid('33333333-3333-3333-3333-333333333333'),
        uuid('44444444-4444-4444-4444-444444444444'),
        uuid('55555555-5555-5555-5555-555555555555')
    ];
    supplier_names text[] := ARRAY[
        'Sharma Ji Kitchen',
        'Patel Food Paradise',
        'Singh Spice World',
        'Reddy Authentic Foods',
        'Verma Fresh Foods'
    ];
    supplier_descriptions text[] := ARRAY[
        'Authentic North Indian cuisine specializing in vegetarian delicacies',
        'Traditional Gujarati thali and snacks',
        'Premium Punjabi dishes and fresh dairy products',
        'South Indian delicacies and instant mixes',
        'Fresh and organic Indian groceries and spices'
    ];
BEGIN
    -- Insert suppliers
    FOR i IN 1..5 LOOP
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (
            supplier_ids[i],
            'supplier' || i || '@example.com',
            jsonb_build_object(
                'business_name', supplier_names[i],
                'type', 'supplier'
            )
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO suppliers (id, name, description)
        VALUES (
            supplier_ids[i],
            supplier_names[i],
            supplier_descriptions[i]
        ) ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;

-- Insert products for each supplier
DO $$
DECLARE
    supplier_record RECORD;
    product_names text[][];
    product_descriptions text[][];
    product_prices decimal[][];
    product_units text[][];
    product_categories text[][];
    product_images text[][];
BEGIN
    -- Define products for each supplier
    product_names := ARRAY[
        -- Sharma Ji Kitchen Products (North Indian)
        ARRAY[
            'Dal Makhani', 'Paneer Butter Masala', 'Jeera Rice',
            'Butter Naan', 'Malai Kofta', 'Palak Paneer',
            'Chana Masala', 'Mixed Vegetable Curry', 'Rajma Chawal',
            'Aloo Paratha'
        ],
        -- Patel Food Paradise Products (Gujarati)
        ARRAY[
            'Dhokla', 'Khandvi', 'Thepla',
            'Gathiya', 'Fafda', 'Khakhra',
            'Undhiyu', 'Basundi', 'Gujarati Kadhi',
            'Methi Thepla'
        ],
        -- Singh Spice World Products (Punjabi)
        ARRAY[
            'Butter Chicken', 'Amritsari Fish', 'Tandoori Roti',
            'Sarson Ka Saag', 'Makki Ki Roti', 'Punjabi Lassi',
            'Chole Bhature', 'Paneer Tikka', 'Dal Tadka',
            'Amritsari Kulcha'
        ],
        -- Reddy Authentic Foods Products (South Indian)
        ARRAY[
            'Masala Dosa', 'Idli Sambar', 'Rava Upma',
            'Medu Vada', 'Mysore Pak', 'Hyderabadi Biryani',
            'Coconut Chutney', 'Rasam', 'Lemon Rice',
            'Andhra Style Chicken'
        ],
        -- Verma Fresh Foods Products (Groceries & Spices)
        ARRAY[
            'Garam Masala', 'Basmati Rice', 'Pure Ghee',
            'Turmeric Powder', 'Red Chili Powder', 'Cumin Seeds',
            'Coriander Powder', 'Cardamom Pods', 'Saffron',
            'Mustard Seeds'
        ]
    ];

    product_descriptions := ARRAY[
        -- Sharma Ji Kitchen Descriptions
        ARRAY[
            'Creamy black lentils slow-cooked overnight',
            'Fresh cottage cheese in rich tomato gravy',
            'Aromatic cumin-flavored basmati rice',
            'Soft and buttery Indian bread',
            'Vegetable dumplings in creamy gravy',
            'Cottage cheese in spinach puree',
            'Spiced chickpeas curry',
            'Assorted vegetables in Indian spices',
            'Kidney beans with steamed rice',
            'Stuffed whole wheat bread with potatoes'
        ],
        -- Patel Food Paradise Descriptions
        ARRAY[
            'Steamed fermented rice and gram flour cake',
            'Gram flour rolls in yogurt sauce',
            'Multi-layered flatbread with fenugreek',
            'Crunchy gram flour snack',
            'Crispy chickpea flour snack',
            'Crispy flatbread with spices',
            'Mixed vegetable Gujarati delicacy',
            'Sweet condensed milk dessert',
            'Traditional yogurt curry',
            'Fenugreek flavored flatbread'
        ],
        -- Singh Spice World Descriptions
        ARRAY[
            'Tender chicken in rich tomato gravy',
            'Crispy fried fish Amritsari style',
            'Whole wheat bread from clay oven',
            'Mustard leaves with spices',
            'Corn flour bread',
            'Sweet yogurt drink',
            'Spiced chickpeas with fried bread',
            'Marinated and grilled cottage cheese',
            'Yellow lentils with tempering',
            'Stuffed bread from Amritsar'
        ],
        -- Reddy Authentic Foods Descriptions
        ARRAY[
            'Crispy rice crepe with potato filling',
            'Steamed rice cakes with lentil soup',
            'Semolina breakfast dish',
            'Crispy lentil doughnuts',
            'Traditional ghee-based sweet',
            'Aromatic rice with spices and vegetables',
            'Fresh coconut chutney for dosa/idli',
            'Tangy tamarind soup',
            'Tangy rice with lemon',
            'Spicy Andhra style chicken curry'
        ],
        -- Verma Fresh Foods Descriptions
        ARRAY[
            'Blend of ground spices for Indian cooking',
            'Premium aged basmati rice',
            'Traditional clarified butter',
            'Pure ground turmeric powder',
            'Ground red chili powder',
            'Whole cumin seeds',
            'Ground coriander seeds',
            'Whole green cardamom',
            'Premium quality saffron strands',
            'Black mustard seeds'
        ]
    ];

    product_prices := ARRAY[
        -- Sharma Ji Kitchen Prices
        ARRAY[250, 280, 150, 40, 260, 240, 200, 220, 180, 60]::decimal[],
        -- Patel Food Paradise Prices
        ARRAY[150, 180, 200, 120, 100, 80, 300, 200, 150, 180]::decimal[],
        -- Singh Spice World Prices
        ARRAY[350, 400, 30, 200, 40, 80, 150, 280, 180, 60]::decimal[],
        -- Reddy Authentic Foods Prices
        ARRAY[120, 100, 80, 100, 150, 300, 50, 60, 100, 350]::decimal[],
        -- Verma Fresh Foods Prices
        ARRAY[100, 250, 500, 80, 100, 60, 70, 150, 400, 40]::decimal[]
    ];

    product_units := ARRAY[
        -- Sharma Ji Kitchen Units
        ARRAY['plate', 'plate', 'plate', 'piece', 'plate', 'plate', 'plate', 'plate', 'plate', 'piece'],
        -- Patel Food Paradise Units
        ARRAY['plate', 'plate', 'pack', 'kg', 'kg', 'pack', 'plate', 'kg', 'plate', 'pack'],
        -- Singh Spice World Units
        ARRAY['plate', 'plate', 'piece', 'plate', 'piece', 'glass', 'plate', 'plate', 'plate', 'piece'],
        -- Reddy Authentic Foods Units
        ARRAY['plate', 'plate', 'plate', 'plate', 'kg', 'plate', 'plate', 'bowl', 'plate', 'plate'],
        -- Verma Fresh Foods Units
        ARRAY['100g', 'kg', 'kg', '100g', '100g', '100g', '100g', '50g', 'gram', '100g']
    ];

    product_categories := ARRAY[
        -- Sharma Ji Kitchen Categories
        ARRAY['main_course', 'main_course', 'rice', 'bread', 'main_course', 'main_course', 'main_course', 'main_course', 'main_course', 'bread'],
        -- Patel Food Paradise Categories
        ARRAY['snacks', 'snacks', 'bread', 'snacks', 'snacks', 'bread', 'main_course', 'dessert', 'main_course', 'bread'],
        -- Singh Spice World Categories
        ARRAY['main_course', 'main_course', 'bread', 'main_course', 'bread', 'beverages', 'main_course', 'appetizer', 'main_course', 'bread'],
        -- Reddy Authentic Foods Categories
        ARRAY['main_course', 'breakfast', 'breakfast', 'snacks', 'dessert', 'main_course', 'accompaniment', 'soup', 'rice', 'main_course'],
        -- Verma Fresh Foods Categories
        ARRAY['spices', 'rice', 'dairy', 'spices', 'spices', 'spices', 'spices', 'spices', 'spices', 'spices']
    ];

    product_images := ARRAY[
        -- Sharma Ji Kitchen Images
        ARRAY[
            'https://example.com/dal-makhani.jpg',
            'https://example.com/paneer-butter-masala.jpg',
            'https://example.com/jeera-rice.jpg',
            'https://example.com/butter-naan.jpg',
            'https://example.com/malai-kofta.jpg',
            'https://example.com/palak-paneer.jpg',
            'https://example.com/chana-masala.jpg',
            'https://example.com/mixed-veg.jpg',
            'https://example.com/rajma-chawal.jpg',
            'https://example.com/aloo-paratha.jpg'
        ],
        -- Patel Food Paradise Images
        ARRAY[
            'https://example.com/dhokla.jpg',
            'https://example.com/khandvi.jpg',
            'https://example.com/thepla.jpg',
            'https://example.com/gathiya.jpg',
            'https://example.com/fafda.jpg',
            'https://example.com/khakhra.jpg',
            'https://example.com/undhiyu.jpg',
            'https://example.com/basundi.jpg',
            'https://example.com/gujarati-kadhi.jpg',
            'https://example.com/methi-thepla.jpg'
        ],
        -- Singh Spice World Images
        ARRAY[
            'https://example.com/butter-chicken.jpg',
            'https://example.com/amritsari-fish.jpg',
            'https://example.com/tandoori-roti.jpg',
            'https://example.com/sarson-ka-saag.jpg',
            'https://example.com/makki-roti.jpg',
            'https://example.com/lassi.jpg',
            'https://example.com/chole-bhature.jpg',
            'https://example.com/paneer-tikka.jpg',
            'https://example.com/dal-tadka.jpg',
            'https://example.com/amritsari-kulcha.jpg'
        ],
        -- Reddy Authentic Foods Images
        ARRAY[
            'https://example.com/masala-dosa.jpg',
            'https://example.com/idli-sambar.jpg',
            'https://example.com/upma.jpg',
            'https://example.com/medu-vada.jpg',
            'https://example.com/mysore-pak.jpg',
            'https://example.com/hyderabadi-biryani.jpg',
            'https://example.com/coconut-chutney.jpg',
            'https://example.com/rasam.jpg',
            'https://example.com/lemon-rice.jpg',
            'https://example.com/andhra-chicken.jpg'
        ],
        -- Verma Fresh Foods Images
        ARRAY[
            'https://example.com/garam-masala.jpg',
            'https://example.com/basmati-rice.jpg',
            'https://example.com/ghee.jpg',
            'https://example.com/turmeric.jpg',
            'https://example.com/chili-powder.jpg',
            'https://example.com/cumin.jpg',
            'https://example.com/coriander.jpg',
            'https://example.com/cardamom.jpg',
            'https://example.com/saffron.jpg',
            'https://example.com/mustard-seeds.jpg'
        ]
    ];

    -- Insert products for each supplier
    FOR supplier_record IN SELECT id, name FROM suppliers WHERE id = ANY(ARRAY[
        uuid('11111111-1111-1111-1111-111111111111'),
        uuid('22222222-2222-2222-2222-222222222222'),
        uuid('33333333-3333-3333-3333-333333333333'),
        uuid('44444444-4444-4444-4444-444444444444'),
        uuid('55555555-5555-5555-5555-555555555555')
    ]) LOOP
        FOR i IN 1..10 LOOP
            INSERT INTO products (
                name,
                description,
                price,
                unit,
                category,
                image_url,
                supplier_id,
                user_id,
                quantity,
                created_at,
                updated_at
            )
            SELECT
                product_names[supplier_index][i],
                product_descriptions[supplier_index][i],
                product_prices[supplier_index][i],
                product_units[supplier_index][i],
                product_categories[supplier_index][i],
                product_images[supplier_index][i],
                supplier_record.id,
                supplier_record.id,
                50,  -- Initial stock quantity
                now(),
                now()
            FROM (
                SELECT array_position(ARRAY[
                    uuid('11111111-1111-1111-1111-111111111111'),
                    uuid('22222222-2222-2222-2222-222222222222'),
                    uuid('33333333-3333-3333-3333-333333333333'),
                    uuid('44444444-4444-4444-4444-444444444444'),
                    uuid('55555555-5555-5555-5555-555555555555')
                ], supplier_record.id) as supplier_index
            ) s
            ON CONFLICT (supplier_id, name) DO UPDATE 
            SET 
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                unit = EXCLUDED.unit,
                category = EXCLUDED.category,
                image_url = EXCLUDED.image_url,
                quantity = EXCLUDED.quantity,
                updated_at = now();
        END LOOP;
    END LOOP;
END $$;
