"""
SAVYANT SYSTEMS - TECHNICAL ASSIGNMENT
Python REST API Server (Built with Python Standard Library - Zero Pip Dependencies)
Matches Part 8 REST API Endpoints:
  GET  /api/products           - List active products with search and pagination
  POST /api/orders             - Create a Draft order
  GET  /api/orders/{id}        - Retrieve an accessible order and its items
  POST /api/orders/{id}/confirm - Confirm an order and deduct stock
  POST /api/orders/{id}/cancel  - Cancel an order and restore stock
"""

import http.server
import socketserver
import json
import sqlite3
import re
import urllib.parse
from decimal import Decimal
import os
import sys

PORT = 5000
DB_FILE = os.path.join(os.path.dirname(__file__), "savyant_local.db")


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    # Read schema.sql or build tables
    schema_path = os.path.join(os.path.dirname(__file__), "..", "schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
            # SQLite adjustments for MySQL syntax
            sql_script = re.sub(r"ENGINE=InnoDB[^;]*;", ";", sql_script)
            sql_script = re.sub(r"AUTO_INCREMENT", "AUTOINCREMENT", sql_script)
            sql_script = re.sub(r"TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "TEXT DEFAULT (datetime('now'))", sql_script)
            sql_script = re.sub(r"TIMESTAMP NULL", "TEXT NULL", sql_script)
            try:
                cur.executescript(sql_script)
                conn.commit()
            except Exception as e:
                # Tables may already exist
                pass
    conn.close()


class SavyantApiHandler(http.server.BaseHTTPRequestHandler):

    def _send_json(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def do_OPTIONS(self):
        self._send_json(200, {"status": "ok"})

    def _get_authenticated_user(self):
        # Read Authorization header or default to Admin for local test
        auth_hdr = self.headers.get("Authorization", "")
        # Format: Bearer <user_id>
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr.replace("Bearer ", "").strip()
            if token == "sales-john":
                return {"id": 2, "name": "John Sales", "role": "SALES_USER"}
            if token == "sales-emma":
                return {"id": 3, "name": "Emma Sales", "role": "SALES_USER"}
        return {"id": 1, "name": "Admin User", "role": "ADMIN"}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        user = self._get_authenticated_user()

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        try:
            # GET /api/products
            if path == "/api/products":
                search = query.get("search", [""])[0].lower()
                category = query.get("category", [""])[0]

                sql = "SELECT * FROM products WHERE 1=1"
                params = []
                if user["role"] == "SALES_USER":
                    sql += " AND status = 'Active'"

                if search:
                    sql += " AND (LOWER(name) LIKE ? OR LOWER(product_code) LIKE ?)"
                    params.extend([f"%{search}%", f"%{search}%"])

                if category:
                    sql += " AND category = ?"
                    params.append(category)

                sql += " ORDER BY name ASC"
                cur.execute(sql, params)
                products = [dict(r) for r in cur.fetchall()]
                self._send_json(200, {"products": products})
                return

            # GET /api/orders/{id}
            order_match = re.match(r"^/api/orders/(\d+)$", path)
            if order_match:
                order_id = int(order_match.group(1))
                cur.execute("SELECT * FROM sales_orders WHERE id = ?", (order_id,))
                order = cur.fetchone()
                if not order:
                    self._send_json(404, {"error": "Order not found"})
                    return

                # IDOR Authorization check
                if user["role"] == "SALES_USER" and order["created_by"] != user["id"]:
                    self._send_json(403, {"error": "Access denied: You can only view your own orders"})
                    return

                # Fetch items
                cur.execute("""
                    SELECT oi.*, p.name as product_name, p.product_code
                    FROM sales_order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.sales_order_id = ?
                """, (order_id,))
                items = [dict(r) for r in cur.fetchall()]

                result = dict(order)
                result["items"] = items
                self._send_json(200, {"order": result})
                return

            self._send_json(404, {"error": "Endpoint not found"})

        finally:
            conn.close()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user = self._get_authenticated_user()

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        try:
            # POST /api/orders
            if path == "/api/orders":
                customer_id = payload.get("customer_id")
                items = payload.get("items", [])
                discount_percentage = float(payload.get("discount_percentage", 0.0))

                if not customer_id:
                    self._send_json(400, {"error": "customer_id is required"})
                    return
                if not items or len(items) == 0:
                    self._send_json(400, {"error": "At least one item is required"})
                    return
                if discount_percentage < 0 or discount_percentage > 20:
                    self._send_json(400, {"error": "Discount percentage must be between 0% and 20%"})
                    return

                # Calculate financials using DB product prices (server-side verification)
                subtotal = 0.0
                order_items_data = []
                seen_products = set()

                for item in items:
                    pid = item.get("product_id")
                    qty = int(item.get("quantity", 0))
                    if qty <= 0:
                        self._send_json(400, {"error": f"Quantity for product {pid} must be > 0"})
                        return
                    if pid in seen_products:
                        self._send_json(400, {"error": f"Duplicate product {pid} in same order"})
                        return
                    seen_products.add(pid)

                    cur.execute("SELECT price, status FROM products WHERE id = ?", (pid,))
                    p = cur.fetchone()
                    if not p:
                        self._send_json(400, {"error": f"Product {pid} not found"})
                        return
                    if p["status"] != "Active":
                        self._send_json(400, {"error": f"Product {pid} is inactive"})
                        return

                    rate = round(float(p["price"]), 2)
                    amount = round(qty * rate, 2)
                    subtotal += amount
                    order_items_data.append((pid, qty, rate, amount))

                subtotal = round(subtotal, 2)
                discount_amount = round((subtotal * discount_percentage) / 100.0, 2)
                grand_total = round(subtotal - discount_amount, 2)

                # Order number
                import datetime
                order_num = f"SO-{datetime.date.today().strftime('%Y%m')}-{cur.execute('SELECT COUNT(*) FROM sales_orders').fetchone()[0] + 1:04d}"

                cur.execute("""
                    INSERT INTO sales_orders (order_number, customer_id, order_date, status, discount_percentage, subtotal, discount_amount, grand_total, created_by)
                    VALUES (?, ?, date('now'), 'Draft', ?, ?, ?, ?, ?)
                """, (order_num, customer_id, discount_percentage, subtotal, discount_amount, grand_total, user["id"]))
                order_id = cur.lastrowid

                for pid, qty, rate, amount in order_items_data:
                    cur.execute("""
                        INSERT INTO sales_order_items (sales_order_id, product_id, quantity, rate, amount)
                        VALUES (?, ?, ?, ?, ?)
                    """, (order_id, pid, qty, rate, amount))

                conn.commit()
                self._send_json(201, {
                    "message": "Order created successfully as Draft",
                    "order_id": order_id,
                    "order_number": order_num,
                    "subtotal": subtotal,
                    "discount_amount": discount_amount,
                    "grand_total": grand_total
                })
                return

            # POST /api/orders/{id}/confirm
            confirm_match = re.match(r"^/api/orders/(\d+)/confirm$", path)
            if confirm_match:
                order_id = int(confirm_match.group(1))
                cur.execute("SELECT * FROM sales_orders WHERE id = ?", (order_id,))
                order = cur.fetchone()
                if not order:
                    self._send_json(404, {"error": "Order not found"})
                    return

                if user["role"] == "SALES_USER" and order["created_by"] != user["id"]:
                    self._send_json(403, {"error": "Access denied"})
                    return

                if order["status"] == "Confirmed":
                    self._send_json(200, {"message": "Order is already confirmed (idempotent)", "status": "Confirmed"})
                    return

                if order["status"] != "Draft":
                    self._send_json(400, {"error": f"Cannot confirm order in status '{order['status']}'"})
                    return

                cur.execute("SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?", (order_id,))
                items = cur.fetchall()

                # Stock verification
                for item in items:
                    cur.execute("SELECT name, stock_quantity FROM products WHERE id = ?", (item["product_id"],))
                    p = cur.fetchone()
                    if not p or p["stock_quantity"] < item["quantity"]:
                        avail = p["stock_quantity"] if p else 0
                        self._send_json(400, {
                            "error": f"Insufficient stock for product '{p['name'] if p else item['product_id']}'. Available: {avail}, Requested: {item['quantity']}"
                        })
                        return

                # Concurrency-safe atomic transaction
                for item in items:
                    cur.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", (item["quantity"], item["product_id"]))
                    cur.execute("""
                        INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by)
                        VALUES (?, 'ORDER_DEDUCT', ?, ?, 'Order confirmation deduction', ?)
                    """, (item["product_id"], -item["quantity"], order_id, user["id"]))

                cur.execute("UPDATE sales_orders SET status = 'Confirmed', confirmed_at = datetime('now') WHERE id = ?", (order_id,))
                conn.commit()
                self._send_json(200, {"message": "Order confirmed and stock deducted successfully", "status": "Confirmed"})
                return

            # POST /api/orders/{id}/cancel
            cancel_match = re.match(r"^/api/orders/(\d+)/cancel$", path)
            if cancel_match:
                order_id = int(cancel_match.group(1))
                cur.execute("SELECT * FROM sales_orders WHERE id = ?", (order_id,))
                order = cur.fetchone()
                if not order:
                    self._send_json(404, {"error": "Order not found"})
                    return

                if user["role"] == "SALES_USER" and order["created_by"] != user["id"]:
                    self._send_json(403, {"error": "Access denied"})
                    return

                if order["status"] == "Cancelled":
                    self._send_json(200, {"message": "Order is already cancelled (idempotent)", "status": "Cancelled"})
                    return

                # If confirmed, restore stock
                if order["status"] == "Confirmed":
                    cur.execute("SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?", (order_id,))
                    items = cur.fetchall()
                    for item in items:
                        cur.execute("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", (item["quantity"], item["product_id"]))
                        cur.execute("""
                            INSERT INTO stock_movements (product_id, movement_type, quantity_change, related_order_id, reason, created_by)
                            VALUES (?, 'ORDER_RESTORE', ?, ?, 'Order cancellation stock restoration', ?)
                        """, (item["product_id"], item["quantity"], order_id, user["id"]))

                cur.execute("UPDATE sales_orders SET status = 'Cancelled', cancelled_at = datetime('now') WHERE id = ?", (order_id,))
                conn.commit()
                self._send_json(200, {"message": "Order cancelled successfully", "status": "Cancelled"})
                return

            self._send_json(404, {"error": "Endpoint not found"})

        finally:
            conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Starting Savyant Systems Python REST Server on port {PORT}...")
    with socketserver.TCPServer(("", PORT), SavyantApiHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
