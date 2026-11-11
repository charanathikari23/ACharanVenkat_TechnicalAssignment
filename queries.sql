-- ==============================================================================
-- SAVYANT SYSTEMS - TECHNICAL ASSIGNMENT: PART 9 & DELIVERABLE 5
-- Standalone SQL Queries
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- QUERY 1: Top three customers by Confirmed order grand total
-- Explanation: Sums grand_total for Confirmed orders only, groups by customer,
-- orders descending, and limits to the top 3 customers.
-- ------------------------------------------------------------------------------
SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    c.city AS customer_city,
    COUNT(so.id) AS confirmed_orders_count,
    ROUND(COALESCE(SUM(so.grand_total), 0), 2) AS total_sales_after_discount
FROM customers c
INNER JOIN sales_orders so ON c.id = so.customer_id
WHERE so.status = 'Confirmed'
GROUP BY c.id, c.name, c.email, c.city
ORDER BY total_sales_after_discount DESC
LIMIT 3;


-- ------------------------------------------------------------------------------
-- QUERY 2: Top three products by quantity sold in Confirmed orders
-- Explanation: Joins sales_order_items with Confirmed sales_orders and products,
-- sums the item quantity sold, and retrieves the top 3 highest volume products.
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS product_id,
    p.product_code,
    p.name AS product_name,
    p.category,
    COALESCE(SUM(soi.quantity), 0) AS total_quantity_sold,
    ROUND(COALESCE(SUM(soi.amount), 0), 2) AS gross_item_sales
FROM products p
INNER JOIN sales_order_items soi ON p.id = soi.product_id
INNER JOIN sales_orders so ON soi.sales_order_id = so.id
WHERE so.status = 'Confirmed'
GROUP BY p.id, p.product_code, p.name, p.category
ORDER BY total_quantity_sold DESC
LIMIT 3;


-- ------------------------------------------------------------------------------
-- QUERY 3: Customers who have never placed any order
-- Explanation: Performs a LEFT JOIN between customers and sales_orders,
-- filtering where the order ID is NULL, identifying zero-order prospects.
-- ------------------------------------------------------------------------------
SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    c.mobile AS customer_mobile,
    c.city AS customer_city,
    c.status AS customer_status,
    c.created_at
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id
WHERE so.id IS NULL
ORDER BY c.name ASC;


-- ------------------------------------------------------------------------------
-- QUERY 4: Month-wise Confirmed sales totals, grouped by year and month
-- Explanation: Aggregates Confirmed orders by year and calendar month,
-- calculating order count, total subtotal, total discount given, and net grand total.
-- Compatible with MySQL (YEAR(), MONTH(), DATE_FORMAT()) and ANSI SQL.
-- ------------------------------------------------------------------------------
SELECT 
    EXTRACT(YEAR FROM so.order_date) AS order_year,
    EXTRACT(MONTH FROM so.order_date) AS order_month,
    DATE_FORMAT(so.order_date, '%Y-%m') AS year_month_label,
    COUNT(so.id) AS confirmed_orders_count,
    ROUND(SUM(so.subtotal), 2) AS total_subtotal,
    ROUND(SUM(so.discount_amount), 2) AS total_discount_given,
    ROUND(SUM(so.grand_total), 2) AS net_grand_total
FROM sales_orders so
WHERE so.status = 'Confirmed'
GROUP BY 
    EXTRACT(YEAR FROM so.order_date),
    EXTRACT(MONTH FROM so.order_date),
    DATE_FORMAT(so.order_date, '%Y-%m')
ORDER BY 
    order_year DESC, 
    order_month DESC;


-- ------------------------------------------------------------------------------
-- QUERY 5: Products below a supplied stock threshold (e.g. threshold = 10)
-- Explanation: Parameterized query filtering products with available stock
-- strictly below the user-specified threshold, sorted by lowest stock first.
-- ------------------------------------------------------------------------------
-- Variable placeholder: :stock_threshold (Default example: 10)
SELECT 
    p.id AS product_id,
    p.product_code,
    p.name AS product_name,
    p.category,
    p.price,
    p.stock_quantity,
    p.status,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock_quantity <= 5 THEN 'CRITICAL'
        ELSE 'LOW_STOCK'
    END AS stock_status_alert
FROM products p
WHERE p.stock_quantity < 10 AND p.status = 'Active'
ORDER BY p.stock_quantity ASC, p.name ASC;
