-- Seed data for the e-commerce database
-- Run after creating the schema

INSERT INTO categories (id, name, parent_id) VALUES
(1, 'Electronics', NULL),
(2, 'Books', NULL),
(3, 'Clothing', NULL),
(4, 'Home & Garden', NULL),
(5, 'Smartphones', 1),
(6, 'Laptops', 1),
(7, 'Fiction', 2),
(8, 'Non-Fiction', 2);

INSERT INTO users (id, email, name, created_at, status) VALUES
(1, 'alice@example.com', 'Alice Johnson', '2024-01-15', 'active'),
(2, 'bob@example.com', 'Bob Smith', '2024-02-20', 'active'),
(3, 'carol@example.com', 'Carol Williams', '2024-03-10', 'active'),
(4, 'dave@example.com', 'Dave Brown', '2024-04-05', 'inactive'),
(5, 'eve@example.com', 'Eve Davis', '2024-05-12', 'active');

INSERT INTO products (id, name, price, category_id, stock, created_at) VALUES
(1, 'Wireless Headphones', 79.99, 1, 150, '2024-06-01'),
(2, 'USB-C Hub', 34.99, 1, 200, '2024-06-01'),
(3, 'Mechanical Keyboard', 129.99, 1, 75, '2024-06-15'),
(4, 'The Great Novel', 14.99, 7, 500, '2024-05-01'),
(5, 'Python Programming Guide', 39.99, 8, 300, '2024-05-15'),
(6, 'Cotton T-Shirt', 19.99, 3, 1000, '2024-04-01'),
(7, 'Garden Hose', 24.99, 4, 120, '2024-07-01'),
(8, 'Smartphone Case', 9.99, 5, 400, '2024-06-20');

INSERT INTO orders (id, user_id, total_amount, status, created_at) VALUES
(1, 1, 114.98, 'delivered', '2025-01-10'),
(2, 1, 129.99, 'shipped', '2025-02-15'),
(3, 2, 54.98, 'delivered', '2025-01-20'),
(4, 3, 39.99, 'pending', '2025-03-01'),
(5, 5, 19.99, 'delivered', '2025-02-28'),
(6, 1, 89.98, 'cancelled', '2025-03-10');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1, 79.99),
(2, 1, 2, 1, 34.99),
(3, 2, 3, 1, 129.99),
(4, 3, 4, 1, 14.99),
(5, 3, 6, 2, 19.99),
(6, 4, 5, 1, 39.99),
(7, 5, 6, 1, 19.99),
(8, 6, 1, 1, 79.99),
(9, 6, 7, 1, 9.99);

INSERT INTO reviews (id, product_id, user_id, rating, comment, created_at) VALUES
(1, 1, 1, 5, 'Great sound quality and comfortable fit!', '2025-01-15'),
(2, 1, 2, 4, 'Good, but battery could last longer', '2025-02-01'),
(3, 3, 1, 5, 'Best keyboard I have ever used', '2025-02-20'),
(4, 5, 3, 4, 'Clear explanations, great for beginners', '2025-03-05'),
(5, 6, 5, 3, 'Decent quality for the price', '2025-03-10');
