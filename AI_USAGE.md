# AI Usage Disclosure (Part 14)

In accordance with Savyant Systems Technical Assignment guidelines for Fresher / Trainee Software Developer (Part 14), this document discloses the use of AI assistance during the planning, implementation, and verification of the Sales Order & Inventory Management application.

---

## 1. Disclosure Summary Table

| Item | Details |
| :--- | :--- |
| **Tools used** | Google AI Studio (Gemini 2.5 / 3.0 Developer Assistant) |
| **Usage** | 1. Architecting relational schema and concurrency-safe stock deduction workflows.<br>2. Scaffolding boilerplate REST APIs, type definitions, and front-end interface components.<br>3. Formulating comprehensive automated test suites covering edge cases (race conditions, IDOR, CSV edge cases). |
| **Example prompts** | 1. *"Design a normalized MySQL schema for sales orders, line items, and stock movements with check constraints preventing negative inventory and rates."*<br>2. *"Implement a concurrency-safe order confirmation handler using database transactions and row-locking to prevent overselling."*<br>3. *"Write a unit test suite testing order subtotal/grand total calculations, discount constraints between 0% and 20%, and all-or-nothing CSV import rollback."* |
| **Review** | Every piece of AI-generated code was critically reviewed, tested, and validated: <br>• Manual review of financial calculation logic to ensure `round(amount, 2)` consistency.<br>• Automated unit test execution (`python3 debugging_exercise.py`, `python3 test_suite.py`, `npx tsx --test`).<br>• Concurrency and rollback verification for order confirmation and cancellation.<br>• Playwright browser verification for UX workflows, accessibility, and zero-console errors. |
| **Corrections** | **1. Overwriting Accumulator in Calculation**: Fixed the classic `total = amount` bug in Part 11 and ensured strict type validation for non-numeric or negative values.<br>**2. Customer Sales Summary Over-counting**: In Part 9 SQL reporting, corrected query logic using `COUNT(DISTINCT so.id)` and `LEFT JOIN` so customers with 0 orders show up with 0 totals and orders with multiple line items are not counted multiple times.<br>**3. CSV Import Atomicity**: Ensured the CSV import rejects the entire file if any single row contains a duplicate product code or negative value, preventing partial imports. |

---

## 2. Technical Interview Readiness

The candidate is prepared to explain and modify any section of the codebase during the technical interview, specifically:
- **Relational Integrity**: Foreign key constraints, cascading deletions, and soft vs. hard deletion guards.
- **Transactional Stock Updates**: ACID guarantees, `SELECT ... FOR UPDATE` isolation, and rollback mechanisms.
- **Role-Based Access Control**: Enforcing permissions on the backend to prevent Insecure Direct Object References (IDOR).
- **Client-Side UX & Server Synchronization**: Optimistic updates, button debouncing, and server-authoritative calculations.
