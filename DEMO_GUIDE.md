# Deliverable 10: Demo Video Recording Guide & Presentation Script
### Savyant Systems — Sales Order & Inventory Management System (5–8 Minute Walkthrough)

This guide provides a professional, minute-by-minute demonstration script for recording the 5–8 minute video walkthrough required by Deliverable 10.

---

## 1. Video Recording Outline & Timing Plan

| Minute | Phase | Focus Topic | On-Screen Actions |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:00** | Introduction & Problem Overview | Architecture, Business Scenario & Tech Stack | Open browser to Savyant Systems portal. Show Savyant Systems luxury header, role switcher, and database summary. |
| **1:00 – 2:30** | Order Creation & Live Calculations | Dynamic Rows, Rates Freezing & Discount Validation | Click "New Order". Select TechCorp Solutions. Add 2 Keyboards and 3 Mice. Show live Subtotal ($4,500.00), enter 10% discount, show Grand Total ($4,050.00). Save as Draft. |
| **2:30 – 3:45** | Transactional Order Confirmation & Concurrency | Stock Deduction, Concurrency Safety & Mutex | Open the Draft order. Click "Confirm Order". Show confirmation dialog (Part 7 requirement). Confirm order. Show status changing to 'Confirmed'. Switch to 'Stock Movement Ledger' to show `ORDER_DEDUCT` records. |
| **3:45 – 4:45** | Order Cancellation & Stock Restoration | Reversing Deduction & Idempotency | Open a Confirmed order. Click "Cancel Order". Show dialog warning that stock will be restored. Confirm cancellation. Check Stock Ledger to show `ORDER_RESTORE` records. |
| **4:45 – 5:30** | Role-Based Access Control & IDOR | Admin vs. Sales Rep Security | Switch user to John Sales (`john.sales@savyant.com`). Notice only John's orders are visible. Try navigating to another order or editing master data; show that buttons are hidden and backend returns 403 Forbidden. |
| **5:30 – 6:30** | CSV Bulk Import & Row Error Feedback | Admin-only All-or-Nothing Atomicity | Switch back to Admin. Go to 'CSV Bulk Import' tab. Click "Load Invalid Sample". Click "Validate & Import". Show all-or-nothing rejection with row numbers and exact reasons. Next click "Load Valid Sample" and show successful import and opening stock creation. |
| **6:30 – 7:30** | Reports, SQL Queries & Debugging | Standalone SQL Runner & Part 11 Exercise | Open 'Reports & SQL' tab. Show Customer Sales Summary with date filter (showing customers with 0 orders). Open 'Standalone SQL Queries' to run Query 1 through 5. Switch to 'Part 11 Debugging' to showcase the fix for `calculate_total`. |
| **7:30 – 8:00** | Conclusion & Technical Interview Readiness | Deliverables Summary | Open 'Assignment Deliverables' tab. Show checklist of all 10 deliverables, unit tests passing, and wrap up. |

---

## 2. Minute-by-Minute Spoken Script

### Minute 0:00 – 1:00 (Introduction)
> *"Hello, everyone. My name is A Charan Venkat, and this is my submission for the Savyant Systems Fresher / Trainee Software Developer technical assignment: Sales Order & Inventory Management.*
> *The goal of this system is to eliminate errors caused by traditional spreadsheet tracking—specifically incorrect calculations, inventory mismatches, and lack of order traceability.*
> *Our solution is built with a Python and Express REST backend, a normalized MySQL-compatible relational schema with full ACID transactions, and a responsive React frontend styled in Savyant Systems' signature navy and gold aesthetic."*

### Minute 1:00 – 2:30 (Order Lifecycle & Financial Rules)
> *"Let's begin by creating a sales order. Notice that in the top header, we are logged in as Admin, but we can seamlessly simulate different sales reps.*
> *Clicking 'New Order' opens our dynamic modal. Here, only active customers and active products can be selected. I will choose TechCorp Solutions.*
> *Now let's add multiple products: 2 Mechanical Keyboards and 3 Ergonomic Mice. As you can see, the product's current catalog price is fetched automatically and stored as the frozen rate.*
> *Our client updates the subtotal in real time to $4,500.00. If we enter a 10% discount, the discount is calculated as $450.00, yielding a Grand Total of $4,050.00.*
> *The backend strictly enforces a 0% to 20% discount bound and validates duplicate products. When we click 'Save as Draft Order', the order is created without deducting any stock, preserving inventory until confirmation."*

### Minute 2:30 – 3:45 (Transactional Confirmation & Concurrency Safety)
> *"Now let's confirm the order. Notice that before confirming, our system presents an explicit confirmation dialog as required by Part 7.*
> *When I confirm, the server executes a single atomic transaction:*
> *First, it re-verifies inventory under a concurrency lock to prevent race conditions.*
> *Second, it deducts the quantities from our products table.*
> *Third, it inserts audit records into our immutable stock movements ledger.*
> *Fourth, it sets the status to 'Confirmed' and makes the order read-only.*
> *If we now navigate to the 'Stock Movement Ledger' tab, we can see the exact deductions with timestamps and reasons."*

### Minute 3:45 – 4:45 (Order Cancellation)
> *"Now let's demonstrate order cancellation. When cancelling a confirmed order, the system detects that stock was previously deducted and restores those items back to inventory.*
> *Let's click 'Cancel Order'. The cancellation executes atomically, and visiting the Stock Ledger reveals new `ORDER_RESTORE` movements, while repeated cancellations are protected by idempotency guards."*

### Minute 4:45 – 5:30 (RBAC & IDOR Security)
> *"In Part 2, the assignment requires role-based access control. Let's switch from Admin to John Sales.*
> *Notice that John can only see his own orders. Furthermore, if John attempts to access an order created by Emma Sales, the backend intercepts the request and returns 403 Forbidden, eliminating Insecure Direct Object Reference (IDOR) vulnerabilities.*
> *Additionally, master data modification buttons such as 'Add Product' or 'Adjust Stock' are hidden and strictly forbidden on the server for non-admins."*

### Minute 5:30 – 6:30 (CSV Bulk Import & All-or-Nothing Rule)
> *"Let's switch back to Admin and test Part 10: CSV Product Import.*
> *The system enforces all-or-nothing atomicity. If I load the invalid sample CSV containing negative prices, negative stock, and duplicate codes, and click 'Validate & Import', the import fails completely, reporting the exact row numbers and errors.*
> *Now let's load the valid sample CSV. Clicking import succeeds immediately, inserting the products and creating opening stock records in our ledger."*

### Minute 6:30 – 7:30 (Reports, Standalone SQL & Debugging Exercise)
> *"In the 'Reports & SQL' tab, we provide Customer Sales Summaries with date ranges. Notice that customers with 0 orders are properly listed with $0.00 totals, and multi-item orders are not double-counted.*
> *In the 'Standalone SQL' section, we can execute all 5 queries from Part 9 live—including top customers, top products by volume sold, customers with no orders, and low-stock alerts.*
> *In the 'Part 11 Debugging' tab, we show the side-by-side analysis of the faulty `calculate_total` function. The bug was `total = amount` overwriting the accumulator instead of `total += amount`. Our corrected function handles empty lists, missing keys, and invalid numeric values, passing 12 automated tests."*

### Minute 7:30 – 8:00 (Conclusion)
> *"To conclude, all 10 deliverables—including schema.sql, queries.sql, test_suite.py, debugging_exercise.py, sample CSVs, and AI_USAGE.md—are thoroughly completed and verified.*
> *Thank you for your time, and I look forward to the technical interview!"*
