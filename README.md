# Savyant Systems — Sales Order & Inventory Management System
### Fresher / Trainee Software Developer Technical Assignment Solution

**Candidate Name:** A Charan Venkat  
**Submission Package:** `ACharanVenkat_TechnicalAssignment`  
**Target Organization:** Savyant Systems (2026)  
**Core Technologies:** Python 3, JavaScript / TypeScript, React 19, Tailwind CSS, MySQL / SQLite, Express, Git

---

## 1. Executive Summary & Business Scenario

A small trading enterprise previously maintained customer records, products, and orders across disconnected spreadsheets, resulting in computational inaccuracies, stock discrepancies, negative inventory events, and lack of auditability.

This project delivers an end-to-end, production-ready Sales Order and Inventory Management Web Application fulfilling all **14 Parts** and **10 Deliverables** specified in the assignment document:
- **Role-Based Access Control (RBAC):** Strict backend enforcement for `Admin` and `Sales User` roles.
- **Master Data Management:** Customers and Products with search, filtering, uniqueness checks, and safe deletion protections (preventing deletion of referenced entities with 1-click deactivation).
- **Multi-Item Sales Orders:** Live calculations of Item Amount (`Qty × Rate`), Subtotal, Discount (0% to 20%), and Grand Total, with frozen historical rates.
- **Transactional Stock & Concurrency Safety:** ACID transactions with row-level locks / mutexes ensuring that concurrent order confirmations never oversell or allow negative inventory.
- **Stock Movements Ledger:** Full immutable audit logging for all opening balances, order deductions, order cancellation restorations, and manual adjustments.
- **Executive SQL Reporting & Standalone Queries:** Live query runner for all 5 required analytical queries.
- **All-or-Nothing CSV Import:** Admin-only bulk product import with row-by-row error feedback and opening stock recording.
- **Debugging Exercise Solution:** Complete mathematical diagnosis, hardened function, and comprehensive test proof.
- **Automated Testing Suite:** 100% test pass rate across all 9 required scenarios in both Python (`unittest`) and TypeScript (`node:test`).

---

## 2. Default Credentials & Role Matrix

| User Name | Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin User** | `ADMIN` | `admin@savyant.com` | `Admin@123` | Full master data management (add/edit/delete/deactivate), stock adjustments with mandatory reason, CSV bulk product import, view & manage all sales orders, view all reports & stock ledger. |
| **John Sales** | `SALES_USER` | `john.sales@savyant.com` | `Sales@123` | View active catalog & active customers, create sales orders, edit own draft orders, confirm/cancel own orders. **IDOR protected:** Cannot view or edit orders created by other sales users. |
| **Emma Sales** | `SALES_USER` | `emma.sales@savyant.com` | `Sales@123` | Same sales user permissions, verifying multi-tenant user isolation. |

*Note: In the web interface, the simulated user can be switched with one click via the top header bar to instantly test role-based permissions and IDOR isolation.*

---

## 3. Database Design & Entity Relationships

The schema is defined in `schema.sql` (compatible with MySQL 8.0+ InnoDB and ANSI SQL).

### Entity-Relationship Diagram (ERD) Overview

```
 [users]
    | (1)
    |
    |---- (N) [sales_orders] (created_by)
    |---- (N) [stock_movements] (created_by)

 [customers]
    | (1)
    |---- (N) [sales_orders] (customer_id) [ON DELETE RESTRICT]

 [products]
    | (1)
    |---- (N) [sales_order_items] (product_id) [ON DELETE RESTRICT]
    |---- (N) [stock_movements] (product_id) [ON DELETE RESTRICT]

 [sales_orders]
    | (1)
    |---- (N) [sales_order_items] (sales_order_id) [ON DELETE CASCADE]
    |---- (N) [stock_movements] (related_order_id) [ON DELETE SET NULL]
```

### Key Schema Design Decisions

1. **Monetary Precision:** All currency fields (`price`, `rate`, `amount`, `subtotal`, `discount_amount`, `grand_total`) utilize `DECIMAL(10, 2)` or `DECIMAL(12, 2)` with standard half-up rounding. Floating point arithmetic is strictly avoided in monetary storage.
2. **Rate Freezing on Orders:** `sales_order_items.rate` captures a frozen snapshot of the product price at the exact moment the order is saved. Subsequent price changes in master data never alter historical order amounts.
3. **Safe Deletion Policy:** 
   - Customers referenced by existing orders cannot be deleted (`FOREIGN KEY ... ON DELETE RESTRICT`). The application provides an explicit option to mark the customer as `Inactive`.
   - Products referenced by existing order line items or stock movement logs cannot be deleted. The system enforces soft deactivation instead.
4. **Discount Percentage Bounds:** Enforced via `CHECK (discount_percentage >= 0.00 AND discount_percentage <= 20.00)`.
5. **Non-Negative Stock & Quantities:** Enforced via `CHECK (stock_quantity >= 0)` on products, `CHECK (quantity > 0)` on line items, and transactional pre-flight checks.

---

## 4. Concurrency & Stock Consistency Approach

### Problem Statement
When two sales users attempt to confirm orders for the same limited stock item concurrently (e.g. 5 units remaining; User A requests 4 units, User B requests 3 units), a naive system with non-atomic reads and writes causes a race condition leading to overselling (-2 stock).

### Our Solution
1. **Pessimistic Locking / Transaction Mutex:**
   In MySQL: `SELECT stock_quantity FROM products WHERE id = :id FOR UPDATE;`
   In our Node/Python transactional engines, an asynchronous lock/mutex wraps the entire confirmation pipeline.
2. **Double-Check Inventory Verification:**
   Inventory is re-evaluated inside the locked transaction. If any product in the order has `stock_quantity < item.quantity`, the entire confirmation is immediately aborted.
3. **All-or-Nothing Atomicity:**
   If a multi-item order contains 4 items with sufficient stock but 1 item with insufficient stock, zero items are deducted. The transaction issues an immediate `ROLLBACK`.
4. **Idempotency Guard:**
   Repeated confirmation calls on an already-confirmed order return immediately without deducting stock again.
   Repeated cancellation calls on an already-cancelled order return without duplicate stock restoration.

---

## 5. REST API Documentation (Part 8)

Base URL: `/api`  
Authentication: HTTP Bearer Token or `x-user-id` header (`Bearer admin`, `Bearer sales-john`, `Bearer sales-emma`).

### Endpoints

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | List active products (or all for Admin) with search & category filters | Authenticated |
| `POST` | `/api/products` | Create a new product in master data | Admin Only |
| `PUT` | `/api/products/:id` | Update product details | Admin Only |
| `DELETE` | `/api/products/:id` | Delete product (safe check; blocks if referenced) | Admin Only |
| `POST` | `/api/stock-adjustments` | Manually adjust stock with mandatory reason | Admin Only |
| `GET` | `/api/customers` | List customers with search and status filters | Authenticated |
| `POST` | `/api/customers` | Create customer | Admin Only |
| `PUT` | `/api/customers/:id` | Update customer | Admin Only |
| `DELETE` | `/api/customers/:id` | Delete customer (safe check) | Admin Only |
| `GET` | `/api/orders` | List orders (filtered by owner for Sales Users) | Authenticated |
| `POST` | `/api/orders` | Create new Draft order with backend-computed totals | Authenticated |
| `GET` | `/api/orders/:id` | Retrieve single order (IDOR protected) | Authenticated |
| `PUT` | `/api/orders/:id` | Update draft order | Owner / Admin |
| `POST` | `/api/orders/:id/confirm` | Confirm order and deduct stock transactionally | Owner / Admin |
| `POST` | `/api/orders/:id/cancel` | Cancel order (restores stock if confirmed) | Owner / Admin |
| `GET` | `/api/stock-movements` | Query immutable stock movements audit ledger | Authenticated |
| `GET` | `/api/reports/customer-sales` | Customer sales summary with date range | Authenticated |
| `GET` | `/api/reports/product-sales` | Product sales summary | Authenticated |
| `GET` | `/api/reports/low-stock` | Low stock report by user threshold | Authenticated |
| `GET` | `/api/reports/sql-queries/:id` | Run any of the 5 standalone SQL queries | Authenticated |
| `POST` | `/api/products/import-csv` | All-or-nothing CSV product bulk import | Admin Only |

### Example Request & Response: Create Order

**Request:** `POST /api/orders`
```json
{
  "customer_id": 1,
  "discount_percentage": 10.0,
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 3 }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Draft order created successfully",
  "order": {
    "id": 4,
    "order_number": "SO-202611-0004",
    "customer_id": 1,
    "customer_name": "TechCorp Solutions",
    "order_date": "2026-11-11",
    "status": "Draft",
    "discount_percentage": 10,
    "subtotal": 4500.00,
    "discount_amount": 450.00,
    "grand_total": 4050.00,
    "created_by": 2,
    "created_at": "2026-11-11 11:15:00",
    "items": [
      { "product_id": 1, "quantity": 2, "rate": 1500.00, "amount": 3000.00 },
      { "product_id": 2, "quantity": 3, "rate": 500.00, "amount": 1500.00 }
    ]
  }
}
```

---

## 6. How to Run Locally

### Prerequisites
- Node.js 18+ (Node 22 included in environment)
- Python 3.10+

### Option A: Run the Live Full-Stack Application (Express + Vite + React)
```bash
# 1. Install dependencies
npm install

# 2. Start dev server (Express backend + Vite React frontend on http://localhost:3000)
npm run dev

# 3. Open in browser:
# http://localhost:3000
```

### Option B: Run Standalone Python REST API Server
```bash
# Run the pure Python standard library server on port 5000 (Zero external pip dependencies required!)
python3 backend_python/server.py
```

### Option C: Run Automated Tests
```bash
# Run Python Automated Test Suite (All 9 Part 12 Scenarios):
python3 test_suite.py

# Run Part 11 Debugging Exercise Tests (12 Test Cases):
python3 debugging_exercise.py

# Run TypeScript Tests:
npm run test
```

---

## 7. Standalone SQL Queries (Part 9 & queries.sql)

All 5 SQL queries are located in `queries.sql` and can also be run live inside the web app's **Reports & SQL** tab.

1. **Top three customers by Confirmed order grand total:**
   ```sql
   SELECT c.id, c.name, COUNT(so.id) AS confirmed_orders, ROUND(SUM(so.grand_total), 2) AS total_sales
   FROM customers c
   INNER JOIN sales_orders so ON c.id = so.customer_id
   WHERE so.status = 'Confirmed'
   GROUP BY c.id, c.name
   ORDER BY total_sales DESC LIMIT 3;
   ```
2. **Top three products by quantity sold in Confirmed orders:**
   ```sql
   SELECT p.id, p.product_code, p.name, SUM(soi.quantity) AS total_qty
   FROM products p
   INNER JOIN sales_order_items soi ON p.id = soi.product_id
   INNER JOIN sales_orders so ON soi.sales_order_id = so.id
   WHERE so.status = 'Confirmed'
   GROUP BY p.id, p.product_code, p.name
   ORDER BY total_qty DESC LIMIT 3;
   ```
3. **Customers who have never placed any order:**
   ```sql
   SELECT c.* FROM customers c
   LEFT JOIN sales_orders so ON c.id = so.customer_id
   WHERE so.id IS NULL
   ORDER BY c.name ASC;
   ```
4. **Month-wise Confirmed sales totals, grouped by year and month:**
   ```sql
   SELECT EXTRACT(YEAR FROM so.order_date) AS order_year, EXTRACT(MONTH FROM so.order_date) AS order_month,
          COUNT(so.id) AS confirmed_orders, ROUND(SUM(so.grand_total), 2) AS net_grand_total
   FROM sales_orders so
   WHERE so.status = 'Confirmed'
   GROUP BY EXTRACT(YEAR FROM so.order_date), EXTRACT(MONTH FROM so.order_date)
   ORDER BY order_year DESC, order_month DESC;
   ```
5. **Products below a supplied stock threshold (e.g. 10):**
   ```sql
   SELECT p.* FROM products p
   WHERE p.stock_quantity < 10 AND p.status = 'Active'
   ORDER BY p.stock_quantity ASC;
   ```

---

## 8. Debugging Exercise Summary (Part 11)

- **Root Cause:** The buggy function contained `total = amount` instead of `total += amount`, resetting the accumulator on each iteration and returning only the last item.
- **Hardening:** Added type validation, missing key detection, positive whole number quantity checks, non-negative rate checks, and Decimal precision.
- **Verification:** 12 tests in `debugging_exercise.py` pass cleanly.

---

## 9. Assumptions & Known Limitations

1. **Single Currency:** All transactions, prices, and reports are denominated in USD ($) as per scope assumptions.
2. **Single Stock Location:** A centralized inventory warehouse is assumed.
3. **Confirmed Orders Only in Reports:** Cancelled and Draft orders are excluded from financial sales summaries, adhering to standard accounting principles.
4. **Whole Number Quantities:** Unit counts for products are strictly integers (&ge; 1 for orders).
