-- 初始化国家数据
INSERT INTO countries (name, code, status, created_at, updated_at) VALUES
('Japan', 'JPN', true, NOW(), NOW()),
('China', 'CHN', true, NOW(), NOW()),
('Singapore', 'SGP', true, NOW(), NOW()),
('South Korea', 'KOR', true, NOW(), NOW());

-- 初始化港口数据
INSERT INTO ports (name, code, country_id, location, status, created_at, updated_at) VALUES
('Tokyo Port', 'TYO', (SELECT id FROM countries WHERE code = 'JPN'), 'Tokyo Bay', true, NOW(), NOW()),
('Yokohama Port', 'YOK', (SELECT id FROM countries WHERE code = 'JPN'), 'Yokohama Bay', true, NOW(), NOW()),
('Shanghai Port', 'SHA', (SELECT id FROM countries WHERE code = 'CHN'), 'Shanghai', true, NOW(), NOW()),
('Singapore Port', 'SIN', (SELECT id FROM countries WHERE code = 'SGP'), 'Singapore Strait', true, NOW(), NOW()),
('Busan Port', 'BUS', (SELECT id FROM countries WHERE code = 'KOR'), 'Busan', true, NOW(), NOW());

-- 初始化公司数据
INSERT INTO companies (name, country_id, contact, email, phone, status, created_at, updated_at) VALUES
('NYK Line', (SELECT id FROM countries WHERE code = 'JPN'), 'Yamada Taro', 'contact@nyk.co.jp', '+81-3-1234-5678', true, NOW(), NOW()),
('COSCO Shipping', (SELECT id FROM countries WHERE code = 'CHN'), 'Li Wei', 'contact@cosco.com.cn', '+86-21-1234-5678', true, NOW(), NOW()),
('Pacific International Lines', (SELECT id FROM countries WHERE code = 'SGP'), 'Tan Ah Kow', 'contact@pil.com.sg', '+65-6123-4567', true, NOW(), NOW());

-- 初始化船舶数据
INSERT INTO ships (name, company_id, ship_type, capacity, status, created_at, updated_at) VALUES
('NYK Sakura', (SELECT id FROM companies WHERE name = 'NYK Line'), 'Container', 8000, true, NOW(), NOW()),
('NYK Fuji', (SELECT id FROM companies WHERE name = 'NYK Line'), 'Bulk Carrier', 6000, true, NOW(), NOW()),
('COSCO Asia', (SELECT id FROM companies WHERE name = 'COSCO Shipping'), 'Container', 10000, true, NOW(), NOW()),
('PIL Eagle', (SELECT id FROM companies WHERE name = 'Pacific International Lines'), 'Container', 5000, true, NOW(), NOW());

-- 初始化类别数据
INSERT INTO categories (name, code, description, status, created_at, updated_at) VALUES
('Food', 'FOOD', 'Food supplies including fresh, frozen and dry goods', true, NOW(), NOW()),
('Beverage', 'BEV', 'All types of beverages', true, NOW(), NOW()),
('Equipment', 'EQUIP', 'Ship equipment and spare parts', true, NOW(), NOW()),
('Cleaning', 'CLEAN', 'Cleaning supplies and chemicals', true, NOW(), NOW());

-- 初始化供应商数据
INSERT INTO suppliers (name, country_id, contact, email, phone, status, created_at, updated_at) VALUES
('Japan Food Supply Co.', (SELECT id FROM countries WHERE code = 'JPN'), 'Sato Kenji', 'contact@jfs.co.jp', '+81-3-2345-6789', true, NOW(), NOW()),
('Tokyo Marine Supply', (SELECT id FROM countries WHERE code = 'JPN'), 'Tanaka Yuki', 'contact@tms.co.jp', '+81-3-3456-7890', true, NOW(), NOW()),
('Shanghai Supply Chain Co.', (SELECT id FROM countries WHERE code = 'CHN'), 'Zhang Wei', 'contact@ssc.com.cn', '+86-21-2345-6789', true, NOW(), NOW()),
('Singapore Marine Logistics', (SELECT id FROM countries WHERE code = 'SGP'), 'Lim Mei Ling', 'contact@sml.com.sg', '+65-6234-5678', true, NOW(), NOW());

-- 初始化供应商类别关联
INSERT INTO supplier_categories (supplier_id, category_id, created_at) VALUES
((SELECT id FROM suppliers WHERE name = 'Japan Food Supply Co.'), (SELECT id FROM categories WHERE code = 'FOOD'), NOW()),
((SELECT id FROM suppliers WHERE name = 'Japan Food Supply Co.'), (SELECT id FROM categories WHERE code = 'BEV'), NOW()),
((SELECT id FROM suppliers WHERE name = 'Tokyo Marine Supply'), (SELECT id FROM categories WHERE code = 'EQUIP'), NOW()),
((SELECT id FROM suppliers WHERE name = 'Shanghai Supply Chain Co.'), (SELECT id FROM categories WHERE code = 'FOOD'), NOW()),
((SELECT id FROM suppliers WHERE name = 'Singapore Marine Logistics'), (SELECT id FROM categories WHERE code = 'CLEAN'), NOW());

-- 初始化产品数据
INSERT INTO products (
    product_name_en, product_name_jp, code, country_id, category_id, supplier_id, port_id,
    unit, price, unit_size, pack_size, country_of_origin, brand, currency,
    effective_from, effective_to, status, created_at, updated_at
) VALUES
(
    'Japanese Rice', '日本米', 'RICE001',
    (SELECT id FROM countries WHERE code = 'JPN'),
    (SELECT id FROM categories WHERE code = 'FOOD'),
    (SELECT id FROM suppliers WHERE name = 'Japan Food Supply Co.'),
    (SELECT id FROM ports WHERE code = 'TYO'),
    'kg', 500.00, '1kg', 20, 'Japan', 'Koshihikari', 'JPY',
    NOW(), NULL, true, NOW(), NOW()
),
(
    'Mineral Water', 'ミネラルウォーター', 'WAT001',
    (SELECT id FROM countries WHERE code = 'JPN'),
    (SELECT id FROM categories WHERE code = 'BEV'),
    (SELECT id FROM suppliers WHERE name = 'Japan Food Supply Co.'),
    (SELECT id FROM ports WHERE code = 'TYO'),
    'bottle', 200.00, '500ml', 24, 'Japan', 'Crystal Spring', 'JPY',
    NOW(), NULL, true, NOW(), NOW()
),
(
    'Engine Oil', 'エンジンオイル', 'OIL001',
    (SELECT id FROM countries WHERE code = 'SGP'),
    (SELECT id FROM categories WHERE code = 'EQUIP'),
    (SELECT id FROM suppliers WHERE name = 'Singapore Marine Logistics'),
    (SELECT id FROM ports WHERE code = 'SIN'),
    'L', 1500.00, '20L', 1, 'Singapore', 'Marine Pro', 'SGD',
    NOW(), NULL, true, NOW(), NOW()
); 