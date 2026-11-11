-- ==============================================================================
-- SAVYANT SYSTEMS - SALES ORDER & INVENTORY MANAGEMENT SYSTEM
-- Database Schema Definition & Initial Seed Data
-- Compatible with MySQL 8.0+ and standard ANSI SQL
-- ==============================================================================

-- Drop tables in reverse foreign-key dependency order
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS sales_order_items;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated users and roles (ADMIN, SALES_USER)
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'SALES_USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN', 'SALES_USER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);

-- ------------------------------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- Master data for customers with active/inactive status
-- ------------------------------------------------------------------------------
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_customer_status CHECK (status IN ('Active', 'Inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- Master data for products. Monetary prices use DECIMAL(10, 2).
-- Stock quantity is integer and must be non-negative.
-- ------------------------------------------------------------------------------
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_price CHECK (price >= 0.00),
    CONSTRAINT chk_product_stock CHECK (stock_quantity >= 0),
    CONSTRAINT chk_product_status CHECK (status IN ('Active', 'Inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);

-- ------------------------------------------------------------------------------
-- 4. SALES ORDERS TABLE
-- Header for sales orders.
-- Discount percentage is bounded between 0 and 20.
-- Status transitions: Draft -> Confirmed / Cancelled; Confirmed -> Cancelled.
-- ------------------------------------------------------------------------------
CREATE TABLE sales_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_status CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
    CONSTRAINT chk_order_discount CHECK (discount_percentage >= 0.00 AND discount_percentage <= 20.00),
    CONSTRAINT chk_order_subtotal CHECK (subtotal >= 0.00),
    CONSTRAINT chk_order_grand_total CHECK (grand_total >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_orders_status ON sales_orders(status);
CREATE INDEX idx_orders_date ON sales_orders(order_date);
CREATE INDEX idx_orders_created_by ON sales_orders(created_by);

-- ------------------------------------------------------------------------------
-- 5. SALES ORDER ITEMS TABLE
-- Line items for each sales order.
-- Stores frozen unit rate at the time of order creation.
-- ------------------------------------------------------------------------------
CREATE TABLE sales_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_items_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT uq_order_product UNIQUE (sales_order_id, product_id),
    CONSTRAINT chk_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_item_rate CHECK (rate >= 0.00),
    CONSTRAINT chk_item_amount CHECK (amount >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_items_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_items_product ON sales_order_items(product_id);

-- ------------------------------------------------------------------------------
-- 6. STOCK MOVEMENTS TABLE
-- Immutable audit ledger of all inventory increments and decrements
-- ------------------------------------------------------------------------------
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    quantity_change INT NOT NULL,
    related_order_id INT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_order FOREIGN KEY (related_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_movement_type CHECK (movement_type IN ('OPENING', 'ORDER_DEDUCT', 'ORDER_RESTORE', 'MANUAL_ADJUSTMENT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_movements_order ON stock_movements(related_order_id);
CREATE INDEX idx_movements_time ON stock_movements(timestamp);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Seed Users (Passwords hashed using SHA256 / PBKDF2)
-- admin@savyant.com / Admin@123 -> hash: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
-- john.sales@savyant.com / Sales@123 -> hash: 3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412
-- emma.sales@savyant.com / Sales@123 -> hash: 3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Admin User', 'admin@savyant.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'ADMIN'),
(2, 'John Sales', 'john.sales@savyant.com', '3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412', 'SALES_USER'),
(3, 'Emma Sales', 'emma.sales@savyant.com', '3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412', 'SALES_USER');

-- Seed Customers
INSERT INTO customers (id, name, email, mobile, city, status) VALUES
(1, 'TechCorp Solutions', 'procurement@techcorp.com', '+1-555-0101', 'San Jose', 'Active'),
(2, 'Apex Retailers', 'orders@apexretail.com', '+1-555-0102', 'Chicago', 'Active'),
(3, 'Global Traders Inc', 'supply@globaltraders.com', '+1-555-0103', 'New York', 'Active'),
(4, 'Zenith Enterprises', 'contact@zenithent.com', '+1-555-0104', 'Austin', 'Active'),
(5, 'Dormant Imports Ltd', 'info@dormantimports.com', '+1-555-0105', 'Seattle', 'Inactive');

-- Seed Products
INSERT INTO products (id, product_code, name, category, price, stock_quantity, status) VALUES
(1, 'PRD-001', 'Mechanical Keyboard', 'Electronics', 1500.00, 25, 'Active'),
(2, 'PRD-002', 'Wireless Ergonomic Mouse', 'Electronics', 500.00, 48, 'Active'),
(3, 'PRD-003', '27-inch 4K IPS Monitor', 'Displays', 12500.00, 8, 'Active'),
(4, 'PRD-004', 'Braided USB-C Cable (2m)', 'Accessories', 250.00, 115, 'Active'),
(5, 'PRD-005', 'High-Density Desk Mat', 'Accessories', 450.00, 6, 'Active'),
(6, 'PRD-006', 'Legacy Serial Adapter', 'Legacy', 180.00, 0, 'Inactive');

-- Seed Initial Opening Stock Movements
INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by, timestamp) VALUES
(1, 'OPENING', 25, NULL, 'Initial inventory count', 1, '2026-10-01 09:00:00'),
(2, 'OPENING', 50, NULL, 'Initial inventory count', 1, '2026-10-01 09:00:00'),
(3, 'OPENING', 10, NULL, 'Initial inventory count', 1, '2026-10-01 09:00:00'),
(4, 'OPENING', 120, NULL, 'Initial inventory count', 1, '2026-10-01 09:00:00'),
(5, 'OPENING', 10, NULL, 'Initial inventory count', 1, '2026-10-01 09:00:00');

-- Seed Orders
-- Order 1: Confirmed order with 2 keyboards and 3 mice (Example from assignment specification)
-- Subtotal: 3000 + 1500 = 4500. Discount 10% = 450. Grand Total = 4050.
INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, discount_percentage, subtotal, discount_amount, grand_total, created_by, created_at, confirmed_at) VALUES
(1, 'SO-202610-0001', 1, '2026-10-15', 'Confirmed', 10.00, 4500.00, 450.00, 4050.00, 2, '2026-10-15 10:30:00', '2026-10-15 10:35:00');

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES
(1, 1, 2, 1500.00, 3000.00),
(1, 2, 3, 500.00, 1500.00);

-- Record stock deduction movements for Order 1
INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by, timestamp) VALUES
(1, 'ORDER_DEDUCT', -2, 1, 'Order SO-202610-0001 confirmation deduction', 2, '2026-10-15 10:35:00'),
(2, 'ORDER_DEDUCT', -3, 1, 'Order SO-202610-0001 confirmation deduction', 2, '2026-10-15 10:35:00');

-- Order 2: Confirmed order for Monitor & Cables
INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, discount_percentage, subtotal, discount_amount, grand_total, created_by, created_at, confirmed_at) VALUES
(2, 'SO-202610-0002', 2, '2026-10-20', 'Confirmed', 5.00, 13750.00, 687.50, 13062.50, 2, '2026-10-20 14:10:00', '2026-10-20 14:12:00');

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES
(2, 3, 1, 12500.00, 12500.00),
(2, 4, 5, 250.00, 1250.00);

INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by, timestamp) VALUES
(3, 'ORDER_DEDUCT', -1, 2, 'Order SO-202610-0002 confirmation deduction', 2, '2026-10-20 14:12:00'),
(4, 'ORDER_DEDUCT', -5, 2, 'Order SO-202610-0002 confirmation deduction', 2, '2026-10-20 14:12:00');

-- Order 3: Draft order created by Emma Sales
INSERT INTO sales_orders (id, order_number, customer_id, order_date, status, discount_percentage, subtotal, discount_amount, grand_total, created_by, created_at) VALUES
(3, 'SO-202611-0003', 3, '2026-11-05', 'Draft', 15.00, 3450.00, 517.50, 2932.50, 3, '2026-11-05 11:00:00');

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount) VALUES
(3, 1, 1, 1500.00, 1500.00),
(3, 2, 3, 500.00, 1500.00),
(3, 5, 1, 450.00, 450.00);
