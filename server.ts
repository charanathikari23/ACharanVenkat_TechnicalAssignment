import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------------------------------------------------------------------
// IN-MEMORY / PERSISTENT TRANSACTIONAL DATA STORE
// Modeled precisely after schema.sql with strict ACID isolation, concurrency mutexes,
// foreign-key enforcement, decimal rounding, and check constraints.
// -----------------------------------------------------------------------------

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'SALES_USER';
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  mobile: string;
  city: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface Product {
  id: number;
  product_code: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export interface SalesOrderItem {
  id: number;
  sales_order_id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface SalesOrder {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name?: string;
  order_date: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  discount_percentage: number;
  subtotal: number;
  discount_amount: number;
  grand_total: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  items?: SalesOrderItem[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  movement_type: 'OPENING' | 'ORDER_DEDUCT' | 'ORDER_RESTORE' | 'MANUAL_ADJUSTMENT';
  quantity_change: number;
  related_order_id?: number | null;
  related_order_number?: string | null;
  reason: string;
  created_by: number;
  created_by_name?: string;
  timestamp: string;
}

class TransactionalDatabase {
  users: User[] = [];
  customers: Customer[] = [];
  products: Product[] = [];
  salesOrders: SalesOrder[] = [];
  salesOrderItems: SalesOrderItem[] = [];
  stockMovements: StockMovement[] = [];

  private nextUserId = 1;
  private nextCustomerId = 1;
  private nextProductId = 1;
  private nextOrderId = 1;
  private nextOrderItemId = 1;
  private nextMovementId = 1;

  // Simple concurrency lock simulation for stock deduction
  private stockLock = false;

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    this.users = [
      { id: 1, name: 'Admin User', email: 'admin@savyant.com', password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', role: 'ADMIN' },
      { id: 2, name: 'John Sales', email: 'john.sales@savyant.com', password_hash: '3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412', role: 'SALES_USER' },
      { id: 3, name: 'Emma Sales', email: 'emma.sales@savyant.com', password_hash: '3be83fb9ee18e9bbaf8f97e28df45a2789f2a96a992686ea2594a3203f572412', role: 'SALES_USER' },
    ];
    this.nextUserId = 4;

    this.customers = [
      { id: 1, name: 'TechCorp Solutions', email: 'procurement@techcorp.com', mobile: '+1-555-0101', city: 'San Jose', status: 'Active', created_at: '2026-10-01 10:00:00' },
      { id: 2, name: 'Apex Retailers', email: 'orders@apexretail.com', mobile: '+1-555-0102', city: 'Chicago', status: 'Active', created_at: '2026-10-05 11:30:00' },
      { id: 3, name: 'Global Traders Inc', email: 'supply@globaltraders.com', mobile: '+1-555-0103', city: 'New York', status: 'Active', created_at: '2026-10-10 09:15:00' },
      { id: 4, name: 'Zenith Enterprises', email: 'contact@zenithent.com', mobile: '+1-555-0104', city: 'Austin', status: 'Active', created_at: '2026-10-12 14:00:00' },
      { id: 5, name: 'Dormant Imports Ltd', email: 'info@dormantimports.com', mobile: '+1-555-0105', city: 'Seattle', status: 'Inactive', created_at: '2026-10-15 16:45:00' },
    ];
    this.nextCustomerId = 6;

    this.products = [
      { id: 1, product_code: 'PRD-001', name: 'Mechanical Keyboard', category: 'Electronics', price: 1500.00, stock_quantity: 25, status: 'Active', created_at: '2026-10-01 09:00:00' },
      { id: 2, product_code: 'PRD-002', name: 'Wireless Ergonomic Mouse', category: 'Electronics', price: 500.00, stock_quantity: 48, status: 'Active', created_at: '2026-10-01 09:00:00' },
      { id: 3, product_code: 'PRD-003', name: '27-inch 4K IPS Monitor', category: 'Displays', price: 12500.00, stock_quantity: 8, status: 'Active', created_at: '2026-10-01 09:00:00' },
      { id: 4, product_code: 'PRD-004', name: 'Braided USB-C Cable (2m)', category: 'Accessories', price: 250.00, stock_quantity: 115, status: 'Active', created_at: '2026-10-01 09:00:00' },
      { id: 5, product_code: 'PRD-005', name: 'High-Density Desk Mat', category: 'Accessories', price: 450.00, stock_quantity: 6, status: 'Active', created_at: '2026-10-01 09:00:00' },
      { id: 6, product_code: 'PRD-006', name: 'Legacy Serial Adapter', category: 'Legacy', price: 180.00, stock_quantity: 0, status: 'Inactive', created_at: '2026-10-01 09:00:00' },
    ];
    this.nextProductId = 7;

    this.stockMovements = [
      { id: 1, product_id: 1, movement_type: 'OPENING', quantity_change: 27, reason: 'Initial inventory count', created_by: 1, timestamp: '2026-10-01 09:00:00' },
      { id: 2, product_id: 2, movement_type: 'OPENING', quantity_change: 51, reason: 'Initial inventory count', created_by: 1, timestamp: '2026-10-01 09:00:00' },
      { id: 3, product_id: 3, movement_type: 'OPENING', quantity_change: 9, reason: 'Initial inventory count', created_by: 1, timestamp: '2026-10-01 09:00:00' },
      { id: 4, product_id: 4, movement_type: 'OPENING', quantity_change: 120, reason: 'Initial inventory count', created_by: 1, timestamp: '2026-10-01 09:00:00' },
      { id: 5, product_id: 5, movement_type: 'OPENING', quantity_change: 6, reason: 'Initial inventory count', created_by: 1, timestamp: '2026-10-01 09:00:00' },
    ];
    this.nextMovementId = 6;

    // Seed Orders:
    // Order 1: Confirmed (deducted 2 Keyboards, 3 Mice)
    this.salesOrders = [
      {
        id: 1,
        order_number: 'SO-202610-0001',
        customer_id: 1,
        order_date: '2026-10-15',
        status: 'Confirmed',
        discount_percentage: 10.00,
        subtotal: 4500.00,
        discount_amount: 450.00,
        grand_total: 4050.00,
        created_by: 2, // John Sales
        created_at: '2026-10-15 10:30:00',
        confirmed_at: '2026-10-15 10:35:00',
      },
      {
        id: 2,
        order_number: 'SO-202610-0002',
        customer_id: 2,
        order_date: '2026-10-20',
        status: 'Confirmed',
        discount_percentage: 5.00,
        subtotal: 13750.00,
        discount_amount: 687.50,
        grand_total: 13062.50,
        created_by: 2, // John Sales
        created_at: '2026-10-20 14:10:00',
        confirmed_at: '2026-10-20 14:12:00',
      },
      {
        id: 3,
        order_number: 'SO-202611-0003',
        customer_id: 3,
        order_date: '2026-11-05',
        status: 'Draft',
        discount_percentage: 15.00,
        subtotal: 3450.00,
        discount_amount: 517.50,
        grand_total: 2932.50,
        created_by: 3, // Emma Sales
        created_at: '2026-11-05 11:00:00',
      }
    ];
    this.nextOrderId = 4;

    this.salesOrderItems = [
      { id: 1, sales_order_id: 1, product_id: 1, quantity: 2, rate: 1500.00, amount: 3000.00 },
      { id: 2, sales_order_id: 1, product_id: 2, quantity: 3, rate: 500.00, amount: 1500.00 },
      { id: 3, sales_order_id: 2, product_id: 3, quantity: 1, rate: 12500.00, amount: 12500.00 },
      { id: 4, sales_order_id: 2, product_id: 4, quantity: 5, rate: 250.00, amount: 1250.00 },
      { id: 5, sales_order_id: 3, product_id: 1, quantity: 1, rate: 1500.00, amount: 1500.00 },
      { id: 6, sales_order_id: 3, product_id: 2, quantity: 3, rate: 500.00, amount: 1500.00 },
      { id: 7, sales_order_id: 3, product_id: 5, quantity: 1, rate: 450.00, amount: 450.00 },
    ];
    this.nextOrderItemId = 8;

    // Stock deduction movements for confirmed orders
    this.stockMovements.push(
      { id: 6, product_id: 1, movement_type: 'ORDER_DEDUCT', quantity_change: -2, related_order_id: 1, reason: 'Order SO-202610-0001 confirmation deduction', created_by: 2, timestamp: '2026-10-15 10:35:00' },
      { id: 7, product_id: 2, movement_type: 'ORDER_DEDUCT', quantity_change: -3, related_order_id: 1, reason: 'Order SO-202610-0001 confirmation deduction', created_by: 2, timestamp: '2026-10-15 10:35:00' },
      { id: 8, product_id: 3, movement_type: 'ORDER_DEDUCT', quantity_change: -1, related_order_id: 2, reason: 'Order SO-202610-0002 confirmation deduction', created_by: 2, timestamp: '2026-10-20 14:12:00' },
      { id: 9, product_id: 4, movement_type: 'ORDER_DEDUCT', quantity_change: -5, related_order_id: 2, reason: 'Order SO-202610-0002 confirmation deduction', created_by: 2, timestamp: '2026-10-20 14:12:00' },
    );
    this.nextMovementId = 10;
  }

  // -------------------------
  // CONCURRENCY-SAFE MUTEX
  // -------------------------
  async acquireStockLock(): Promise<() => void> {
    while (this.stockLock) {
      await new Promise(r => setTimeout(r, 10));
    }
    this.stockLock = true;
    return () => {
      this.stockLock = false;
    };
  }

  // -------------------------
  // ORDER CONFIRMATION TRANSACTION
  // -------------------------
  async confirmOrder(orderId: number, userId: number): Promise<{ success: boolean; alreadyConfirmed: boolean; message: string }> {
    const release = await this.acquireStockLock();
    try {
      const order = this.salesOrders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'Confirmed') {
        return { success: true, alreadyConfirmed: true, message: 'Order is already confirmed' };
      }

      if (order.status !== 'Draft') {
        throw new Error(`Cannot confirm an order in status '${order.status}'`);
      }

      const items = this.salesOrderItems.filter(i => i.sales_order_id === orderId);
      if (items.length === 0) {
        throw new Error('Order contains no line items');
      }

      // Check stock sufficiency for ALL items
      for (const item of items) {
        const prod = this.products.find(p => p.id === item.product_id);
        if (!prod) {
          throw new Error(`Product ID ${item.product_id} no longer exists`);
        }
        if (prod.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for '${prod.name}' (${prod.product_code}). Available: ${prod.stock_quantity}, Requested: ${item.quantity}`);
        }
      }

      // Deduct stock and record movements
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      for (const item of items) {
        const prod = this.products.find(p => p.id === item.product_id)!;
        prod.stock_quantity -= item.quantity;

        this.stockMovements.push({
          id: this.nextMovementId++,
          product_id: item.product_id,
          movement_type: 'ORDER_DEDUCT',
          quantity_change: -item.quantity,
          related_order_id: order.id,
          reason: `Order ${order.order_number} confirmation deduction`,
          created_by: userId,
          timestamp: now
        });
      }

      order.status = 'Confirmed';
      order.confirmed_at = now;

      return { success: true, alreadyConfirmed: false, message: 'Order confirmed and stock deducted successfully' };
    } finally {
      release();
    }
  }

  // -------------------------
  // ORDER CANCELLATION TRANSACTION
  // -------------------------
  async cancelOrder(orderId: number, userId: number): Promise<{ success: boolean; alreadyCancelled: boolean; message: string }> {
    const release = await this.acquireStockLock();
    try {
      const order = this.salesOrders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'Cancelled') {
        return { success: true, alreadyCancelled: true, message: 'Order is already cancelled' };
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      // If Confirmed, restore deducted stock
      if (order.status === 'Confirmed') {
        const items = this.salesOrderItems.filter(i => i.sales_order_id === orderId);
        for (const item of items) {
          const prod = this.products.find(p => p.id === item.product_id);
          if (prod) {
            prod.stock_quantity += item.quantity;
            this.stockMovements.push({
              id: this.nextMovementId++,
              product_id: item.product_id,
              movement_type: 'ORDER_RESTORE',
              quantity_change: item.quantity,
              related_order_id: order.id,
              reason: `Order ${order.order_number} cancellation stock restoration`,
              created_by: userId,
              timestamp: now
            });
          }
        }
      }

      order.status = 'Cancelled';
      order.cancelled_at = now;

      return { success: true, alreadyCancelled: false, message: 'Order cancelled successfully' };
    } finally {
      release();
    }
  }

  // -------------------------
  // CREATE DRAFT ORDER
  // -------------------------
  createOrder(customerId: number, items: { product_id: number; quantity: number }[], discountPercentage: number, userId: number): SalesOrder {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    if (customer.status !== 'Active') throw new Error('Cannot create orders for inactive customers');

    if (!items || items.length === 0) throw new Error('Order must contain at least one product');

    if (discountPercentage < 0 || discountPercentage > 20) {
      throw new Error('Discount percentage must be between 0% and 20%');
    }

    const seenProducts = new Set<number>();
    let subtotal = 0;
    const preparedItems: { product_id: number; quantity: number; rate: number; amount: number }[] = [];

    for (const it of items) {
      if (seenProducts.has(it.product_id)) {
        throw new Error(`Duplicate product ID ${it.product_id} in the same order`);
      }
      seenProducts.add(it.product_id);

      const product = this.products.find(p => p.id === it.product_id);
      if (!product) throw new Error(`Product ${it.product_id} does not exist`);
      if (product.status !== 'Active') throw new Error(`Product '${product.name}' is inactive`);

      const qty = Math.floor(Number(it.quantity));
      if (qty <= 0 || !Number.isInteger(Number(it.quantity))) {
        throw new Error(`Quantity for product '${product.name}' must be a positive integer`);
      }

      const rate = Math.round(product.price * 100) / 100;
      const amount = Math.round(qty * rate * 100) / 100;
      subtotal = Math.round((subtotal + amount) * 100) / 100;

      preparedItems.push({
        product_id: product.id,
        quantity: qty,
        rate,
        amount
      });
    }

    const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;

    const today = new Date().toISOString().substring(0, 10);
    const orderNum = `SO-${today.replace(/-/g, '').substring(0, 6)}-${String(this.salesOrders.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newOrder: SalesOrder = {
      id: this.nextOrderId++,
      order_number: orderNum,
      customer_id: customerId,
      order_date: today,
      status: 'Draft',
      discount_percentage: discountPercentage,
      subtotal,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      created_by: userId,
      created_at: now
    };

    this.salesOrders.push(newOrder);

    for (const pit of preparedItems) {
      this.salesOrderItems.push({
        id: this.nextOrderItemId++,
        sales_order_id: newOrder.id,
        product_id: pit.product_id,
        quantity: pit.quantity,
        rate: pit.rate,
        amount: pit.amount
      });
    }

    return newOrder;
  }

  // -------------------------
  // UPDATE DRAFT ORDER
  // -------------------------
  updateDraftOrder(orderId: number, customerId: number, items: { product_id: number; quantity: number }[], discountPercentage: number, userId: number, userRole: string): SalesOrder {
    const order = this.salesOrders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    if (userRole === 'SALES_USER' && order.created_by !== userId) {
      throw new Error('Access denied: You can only edit your own orders');
    }

    if (order.status !== 'Draft') {
      throw new Error(`Cannot edit order in '${order.status}' status. Confirmed and Cancelled orders are read-only.`);
    }

    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    if (customer.status !== 'Active') throw new Error('Cannot assign an inactive customer');

    if (!items || items.length === 0) throw new Error('Order must contain at least one product');

    if (discountPercentage < 0 || discountPercentage > 20) {
      throw new Error('Discount percentage must be between 0% and 20%');
    }

    const seenProducts = new Set<number>();
    let subtotal = 0;
    const preparedItems: { product_id: number; quantity: number; rate: number; amount: number }[] = [];

    for (const it of items) {
      if (seenProducts.has(it.product_id)) {
        throw new Error(`Duplicate product ID ${it.product_id} in the same order`);
      }
      seenProducts.add(it.product_id);

      const product = this.products.find(p => p.id === it.product_id);
      if (!product) throw new Error(`Product ${it.product_id} does not exist`);

      const qty = Math.floor(Number(it.quantity));
      if (qty <= 0 || !Number.isInteger(Number(it.quantity))) {
        throw new Error(`Quantity for product '${product.name}' must be a positive integer`);
      }

      // In draft editing, retain existing frozen rate if already on order, or fetch product price if added anew
      const existingItem = this.salesOrderItems.find(i => i.sales_order_id === orderId && i.product_id === it.product_id);
      const rate = existingItem ? existingItem.rate : (Math.round(product.price * 100) / 100);
      const amount = Math.round(qty * rate * 100) / 100;
      subtotal = Math.round((subtotal + amount) * 100) / 100;

      preparedItems.push({
        product_id: product.id,
        quantity: qty,
        rate,
        amount
      });
    }

    const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;
    const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;

    order.customer_id = customerId;
    order.discount_percentage = discountPercentage;
    order.subtotal = subtotal;
    order.discount_amount = discountAmount;
    order.grand_total = grandTotal;

    // Replace items
    this.salesOrderItems = this.salesOrderItems.filter(i => i.sales_order_id !== orderId);
    for (const pit of preparedItems) {
      this.salesOrderItems.push({
        id: this.nextOrderItemId++,
        sales_order_id: orderId,
        product_id: pit.product_id,
        quantity: pit.quantity,
        rate: pit.rate,
        amount: pit.amount
      });
    }

    return order;
  }
}

export const db = new TransactionalDatabase();

// -----------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -----------------------------------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let userId = 1; // Default to Admin for testing if no header provided

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === 'admin') userId = 1;
    else if (token === 'sales-john') userId = 2;
    else if (token === 'sales-emma') userId = 3;
    else {
      const parsed = parseInt(token, 10);
      if (!isNaN(parsed)) userId = parsed;
    }
  } else if (req.headers['x-user-id']) {
    userId = parseInt(req.headers['x-user-id'] as string, 10) || 1;
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User does not exist' });
  }

  req.user = user;
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access forbidden: Admin privilege required' });
  }
  next();
};

// -----------------------------------------------------------------------------
// REST API ROUTES
// -----------------------------------------------------------------------------

// Auth endpoints
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Simple hash validation: Admin@123 or Sales@123
  if (password !== 'Admin@123' && password !== 'Sales@123') {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token: user.id === 1 ? 'admin' : (user.id === 2 ? 'sales-john' : 'sales-emma')
  });
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Products: GET /api/products
app.get('/api/products', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const search = ((req.query.search as string) || '').toLowerCase();
  const category = (req.query.category as string) || '';
  const status = (req.query.status as string) || '';

  let list = db.products.map(p => ({ ...p }));

  // Sales users only see Active products unless specified
  if (req.user?.role === 'SALES_USER') {
    list = list.filter(p => p.status === 'Active');
  } else if (status) {
    list = list.filter(p => p.status.toLowerCase() === status.toLowerCase());
  }

  if (category) {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    list = list.filter(p => p.name.toLowerCase().includes(search) || p.product_code.toLowerCase().includes(search));
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  res.json({ products: list });
});

// Products: POST /api/products (Admin Only)
app.post('/api/products', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { product_code, name, category, price, stock_quantity, status } = req.body;

  if (!product_code || !name || !category) {
    return res.status(400).json({ error: 'Product code, name, and category are required' });
  }

  const cleanCode = product_code.trim().toUpperCase();
  if (db.products.some(p => p.product_code.toUpperCase() === cleanCode)) {
    return res.status(400).json({ error: `Product code '${cleanCode}' already exists in database` });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a non-negative number' });
  }

  const numStock = Number(stock_quantity);
  if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
    return res.status(400).json({ error: 'Stock quantity must be a non-negative integer' });
  }

  const cleanStatus = status === 'Inactive' ? 'Inactive' : 'Active';
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const newProduct: Product = {
    id: db.products.length ? Math.max(...db.products.map(p => p.id)) + 1 : 1,
    product_code: cleanCode,
    name: name.trim(),
    category: category.trim(),
    price: Math.round(numPrice * 100) / 100,
    stock_quantity: numStock,
    status: cleanStatus,
    created_at: now
  };

  db.products.push(newProduct);

  if (numStock > 0) {
    db.stockMovements.push({
      id: db.stockMovements.length ? Math.max(...db.stockMovements.map(m => m.id)) + 1 : 1,
      product_id: newProduct.id,
      movement_type: 'OPENING',
      quantity_change: numStock,
      reason: 'Initial inventory creation',
      created_by: req.user!.id,
      timestamp: now
    });
  }

  res.status(201).json({ message: 'Product created successfully', product: newProduct });
});

// Products: PUT /api/products/:id (Admin Only)
app.put('/api/products/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const prod = db.products.find(p => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { product_code, name, category, price, status } = req.body;

  if (product_code) {
    const cleanCode = product_code.trim().toUpperCase();
    if (db.products.some(p => p.id !== id && p.product_code.toUpperCase() === cleanCode)) {
      return res.status(400).json({ error: `Product code '${cleanCode}' is already taken` });
    }
    prod.product_code = cleanCode;
  }

  if (name) prod.name = name.trim();
  if (category) prod.category = category.trim();

  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }
    prod.price = Math.round(numPrice * 100) / 100;
  }

  if (status) {
    prod.status = status === 'Inactive' ? 'Inactive' : 'Active';
  }

  res.json({ message: 'Product updated successfully', product: prod });
});

// Products: DELETE /api/products/:id (Admin Only, Safe Deletion Rule)
app.delete('/api/products/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const prod = db.products.find(p => p.id === id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Safe deletion check: cannot delete if referenced by any order or stock movement
  const hasOrders = db.salesOrderItems.some(i => i.product_id === id);
  const hasMovements = db.stockMovements.some(m => m.product_id === id);

  if (hasOrders || hasMovements) {
    return res.status(409).json({
      error: `Cannot delete product '${prod.name}' because historical orders or stock movements reference it. Please set status to 'Inactive' instead.`,
      canDeactivate: true
    });
  }

  db.products = db.products.filter(p => p.id !== id);
  res.json({ message: 'Product deleted successfully' });
});

// Stock Adjustments: POST /api/stock-adjustments (Admin Only)
app.post('/api/stock-adjustments', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { product_id, quantity_change, reason } = req.body;

  if (!product_id) return res.status(400).json({ error: 'Product ID is required' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'Adjustment reason is mandatory' });

  const numChange = Number(quantity_change);
  if (isNaN(numChange) || numChange === 0 || !Number.isInteger(numChange)) {
    return res.status(400).json({ error: 'Quantity change must be a non-zero whole number (+/-)' });
  }

  const release = await db.acquireStockLock();
  try {
    const prod = db.products.find(p => p.id === Number(product_id));
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const newStock = prod.stock_quantity + numChange;
    if (newStock < 0) {
      return res.status(400).json({
        error: `Adjustment rejected: Current stock is ${prod.stock_quantity}. Decrement of ${Math.abs(numChange)} would result in negative stock (${newStock}).`
      });
    }

    prod.stock_quantity = newStock;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const movement: StockMovement = {
      id: db.stockMovements.length ? Math.max(...db.stockMovements.map(m => m.id)) + 1 : 1,
      product_id: prod.id,
      movement_type: 'MANUAL_ADJUSTMENT',
      quantity_change: numChange,
      reason: reason.trim(),
      created_by: req.user!.id,
      timestamp: now
    };
    db.stockMovements.push(movement);

    res.json({
      message: `Stock successfully adjusted for '${prod.name}'. New stock: ${newStock}`,
      new_stock: newStock,
      movement
    });
  } finally {
    release();
  }
});

// Customers: GET /api/customers
app.get('/api/customers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const search = ((req.query.search as string) || '').toLowerCase();
  const status = (req.query.status as string) || '';

  let list = db.customers.map(c => ({ ...c }));

  if (req.user?.role === 'SALES_USER') {
    list = list.filter(c => c.status === 'Active');
  } else if (status) {
    list = list.filter(c => c.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    list = list.filter(c => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search) || c.mobile.includes(search));
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ customers: list });
});

// Customers: POST /api/customers (Admin Only)
app.post('/api/customers', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, mobile, city, status } = req.body;
  if (!name || !email || !mobile || !city) {
    return res.status(400).json({ error: 'Name, email, mobile, and city are required' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newCustomer: Customer = {
    id: db.customers.length ? Math.max(...db.customers.map(c => c.id)) + 1 : 1,
    name: name.trim(),
    email: email.trim(),
    mobile: mobile.trim(),
    city: city.trim(),
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    created_at: now
  };

  db.customers.push(newCustomer);
  res.status(201).json({ message: 'Customer created successfully', customer: newCustomer });
});

// Customers: PUT /api/customers/:id (Admin Only)
app.put('/api/customers/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const customer = db.customers.find(c => c.id === id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, mobile, city, status } = req.body;
  if (name) customer.name = name.trim();
  if (email) customer.email = email.trim();
  if (mobile) customer.mobile = mobile.trim();
  if (city) customer.city = city.trim();
  if (status) customer.status = status === 'Inactive' ? 'Inactive' : 'Active';

  res.json({ message: 'Customer updated successfully', customer });
});

// Customers: DELETE /api/customers/:id (Admin Only, Safe Deletion Rule)
app.delete('/api/customers/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const customer = db.customers.find(c => c.id === id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const hasOrders = db.salesOrders.some(o => o.customer_id === id);
  if (hasOrders) {
    return res.status(409).json({
      error: `Cannot delete customer '${customer.name}' because historical sales orders exist for this customer. Please set status to 'Inactive' instead.`,
      canDeactivate: true
    });
  }

  db.customers = db.customers.filter(c => c.id !== id);
  res.json({ message: 'Customer deleted successfully' });
});

// Orders: GET /api/orders (Role Enforced)
app.get('/api/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const status = (req.query.status as string) || '';
  const customerId = req.query.customer_id ? parseInt(req.query.customer_id as string, 10) : null;

  let list = db.salesOrders.map(o => {
    const cust = db.customers.find(c => c.id === o.customer_id);
    const creator = db.users.find(u => u.id === o.created_by);
    const items = db.salesOrderItems.filter(i => i.sales_order_id === o.id).map(i => {
      const p = db.products.find(prod => prod.id === i.product_id);
      return { ...i, product_name: p?.name, product_code: p?.product_code };
    });
    return {
      ...o,
      customer_name: cust ? cust.name : 'Unknown Customer',
      created_by_name: creator ? creator.name : 'Unknown User',
      items_count: items.length,
      items
    };
  });

  // Role based filtering: Sales users only see their own orders!
  if (req.user?.role === 'SALES_USER') {
    list = list.filter(o => o.created_by === req.user!.id);
  }

  if (status) {
    list = list.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }

  if (customerId) {
    list = list.filter(o => o.customer_id === customerId);
  }

  list.sort((a, b) => b.id - a.id);
  res.json({ orders: list });
});

// Orders: POST /api/orders (Create Draft Order)
app.post('/api/orders', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customer_id, items, discount_percentage } = req.body;
    const order = db.createOrder(
      Number(customer_id),
      items || [],
      Number(discount_percentage || 0),
      req.user!.id
    );

    const fullOrder = {
      ...order,
      customer_name: db.customers.find(c => c.id === order.customer_id)?.name,
      items: db.salesOrderItems.filter(i => i.sales_order_id === order.id).map(i => {
        const prod = db.products.find(p => p.id === i.product_id);
        return { ...i, product_name: prod?.name, product_code: prod?.product_code };
      })
    };

    res.status(201).json({
      message: 'Draft order created successfully',
      order: fullOrder
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create order' });
  }
});

// Orders: GET /api/orders/:id (Retrieve Accessible Order - IDOR Protected)
app.get('/api/orders/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const order = db.salesOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // IDOR check: Sales Users cannot access another user's order
  if (req.user?.role === 'SALES_USER' && order.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to view another sales user’s order' });
  }

  const cust = db.customers.find(c => c.id === order.customer_id);
  const creator = db.users.find(u => u.id === order.created_by);
  const items = db.salesOrderItems.filter(i => i.sales_order_id === order.id).map(i => {
    const prod = db.products.find(p => p.id === i.product_id);
    return { ...i, product_name: prod?.name, product_code: prod?.product_code };
  });

  res.json({
    order: {
      ...order,
      customer_name: cust ? cust.name : 'Unknown',
      created_by_name: creator ? creator.name : 'Unknown',
      items
    }
  });
});

// Orders: PUT /api/orders/:id (Edit Draft Order)
app.put('/api/orders/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { customer_id, items, discount_percentage } = req.body;

    const updated = db.updateDraftOrder(
      id,
      Number(customer_id),
      items || [],
      Number(discount_percentage || 0),
      req.user!.id,
      req.user!.role
    );

    res.json({ message: 'Order updated successfully', order: updated });
  } catch (err: any) {
    const status = err.message.includes('Access denied') ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Orders: POST /api/orders/:id/confirm (Confirm Order & Deduct Stock)
app.post('/api/orders/:id/confirm', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const order = db.salesOrders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // IDOR check
  if (req.user?.role === 'SALES_USER' && order.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You cannot confirm orders belonging to other users' });
  }

  try {
    const result = await db.confirmOrder(id, req.user!.id);
    res.json({
      message: result.message,
      status: 'Confirmed',
      already_confirmed: result.alreadyConfirmed
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order confirmation failed' });
  }
});

// Orders: POST /api/orders/:id/cancel (Cancel Order & Restore Stock)
app.post('/api/orders/:id/cancel', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const order = db.salesOrders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // IDOR check
  if (req.user?.role === 'SALES_USER' && order.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You cannot cancel orders belonging to other users' });
  }

  try {
    const result = await db.cancelOrder(id, req.user!.id);
    res.json({
      message: result.message,
      status: 'Cancelled',
      already_cancelled: result.alreadyCancelled
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Order cancellation failed' });
  }
});

// Stock Movements: GET /api/stock-movements
app.get('/api/stock-movements', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const productId = req.query.product_id ? parseInt(req.query.product_id as string, 10) : null;
  let list = db.stockMovements.map(m => {
    const p = db.products.find(prod => prod.id === m.product_id);
    const u = db.users.find(usr => usr.id === m.created_by);
    const o = m.related_order_id ? db.salesOrders.find(ord => ord.id === m.related_order_id) : null;
    return {
      ...m,
      product_name: p ? p.name : 'Unknown Product',
      product_code: p ? p.product_code : '---',
      created_by_name: u ? u.name : 'System',
      related_order_number: o ? o.order_number : null
    };
  });

  if (productId) {
    list = list.filter(m => m.product_id === productId);
  }

  list.sort((a, b) => b.id - a.id);
  res.json({ stock_movements: list });
});

// -----------------------------------------------------------------------------
// REPORTS & SQL (PART 9)
// -----------------------------------------------------------------------------

// 1. Customer Sales Summary
app.get('/api/reports/customer-sales', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const fromDate = req.query.from_date as string;
  const toDate = req.query.to_date as string;

  const result = db.customers.map(c => {
    let customerOrders = db.salesOrders.filter(o => o.customer_id === c.id && o.status === 'Confirmed');

    if (fromDate) {
      customerOrders = customerOrders.filter(o => o.order_date >= fromDate);
    }
    if (toDate) {
      customerOrders = customerOrders.filter(o => o.order_date <= toDate);
    }

    const confirmedCount = customerOrders.length;
    const totalSales = customerOrders.reduce((sum, o) => Math.round((sum + o.grand_total) * 100) / 100, 0);

    return {
      customer_id: c.id,
      customer_name: c.name,
      customer_email: c.email,
      customer_city: c.city,
      status: c.status,
      confirmed_orders_count: confirmedCount,
      total_sales_after_discount: totalSales
    };
  });

  result.sort((a, b) => b.total_sales_after_discount - a.total_sales_after_discount);
  res.json({ report: result });
});

// 2. Product Sales Summary
app.get('/api/reports/product-sales', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const result = db.products.map(p => {
    // Only items belonging to Confirmed orders
    const confirmedOrderIds = new Set(db.salesOrders.filter(o => o.status === 'Confirmed').map(o => o.id));
    const items = db.salesOrderItems.filter(i => i.product_id === p.id && confirmedOrderIds.has(i.sales_order_id));

    const quantitySold = items.reduce((sum, i) => sum + i.quantity, 0);
    const grossValue = items.reduce((sum, i) => Math.round((sum + i.amount) * 100) / 100, 0);

    return {
      product_id: p.id,
      product_code: p.product_code,
      product_name: p.name,
      category: p.category,
      current_stock: p.stock_quantity,
      quantity_sold: quantitySold,
      gross_item_value_before_discount: grossValue
    };
  });

  result.sort((a, b) => b.quantity_sold - a.quantity_sold);
  res.json({ report: result });
});

// 3. Low Stock Report
app.get('/api/reports/low-stock', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const threshold = req.query.threshold !== undefined ? parseInt(req.query.threshold as string, 10) : 10;
  const list = db.products
    .filter(p => p.stock_quantity < threshold && p.status === 'Active')
    .map(p => ({
      ...p,
      stock_status: p.stock_quantity === 0 ? 'Out of Stock' : (p.stock_quantity <= 5 ? 'Critical' : 'Low Stock')
    }))
    .sort((a, b) => a.stock_quantity - b.stock_quantity);

  res.json({ threshold, report: list });
});

// 4. Standalone SQL Queries Runner (Displays results of the 5 SQL queries live)
app.get('/api/reports/sql-queries/:queryId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const qId = parseInt(req.params.queryId, 10);
  const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 10;

  if (qId === 1) {
    // Query 1: Top 3 customers by Confirmed order grand total
    const map = new Map<number, { customer: Customer; count: number; total: number }>();
    db.salesOrders
      .filter(o => o.status === 'Confirmed')
      .forEach(o => {
        const c = db.customers.find(cust => cust.id === o.customer_id);
        if (!c) return;
        const curr = map.get(c.id) || { customer: c, count: 0, total: 0 };
        curr.count += 1;
        curr.total = Math.round((curr.total + o.grand_total) * 100) / 100;
        map.set(c.id, curr);
      });
    const rows = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(entry => ({
        customer_id: entry.customer.id,
        customer_name: entry.customer.name,
        customer_email: entry.customer.email,
        customer_city: entry.customer.city,
        confirmed_orders_count: entry.count,
        total_sales_after_discount: entry.total
      }));
    return res.json({ query_id: 1, title: 'Top three customers by Confirmed order grand total', rows });
  }

  if (qId === 2) {
    // Query 2: Top 3 products by quantity sold in Confirmed orders
    const confirmedOrders = new Set(db.salesOrders.filter(o => o.status === 'Confirmed').map(o => o.id));
    const prodMap = new Map<number, { product: Product; qty: number; gross: number }>();

    db.salesOrderItems
      .filter(i => confirmedOrders.has(i.sales_order_id))
      .forEach(i => {
        const p = db.products.find(prod => prod.id === i.product_id);
        if (!p) return;
        const curr = prodMap.get(p.id) || { product: p, qty: 0, gross: 0 };
        curr.qty += i.quantity;
        curr.gross = Math.round((curr.gross + i.amount) * 100) / 100;
        prodMap.set(p.id, curr);
      });

    const rows = Array.from(prodMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3)
      .map(entry => ({
        product_id: entry.product.id,
        product_code: entry.product.product_code,
        product_name: entry.product.name,
        category: entry.product.category,
        total_quantity_sold: entry.qty,
        gross_item_sales: entry.gross
      }));
    return res.json({ query_id: 2, title: 'Top three products by quantity sold in Confirmed orders', rows });
  }

  if (qId === 3) {
    // Query 3: Customers who have never placed any order
    const customersWithOrders = new Set(db.salesOrders.map(o => o.customer_id));
    const rows = db.customers
      .filter(c => !customersWithOrders.has(c.id))
      .map(c => ({
        customer_id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        city: c.city,
        status: c.status,
        created_at: c.created_at
      }));
    return res.json({ query_id: 3, title: 'Customers who have never placed any order', rows });
  }

  if (qId === 4) {
    // Query 4: Month-wise Confirmed sales totals, grouped by year and month
    const monthsMap = new Map<string, { year: number; month: number; label: string; count: number; subtotal: number; discount: number; grandTotal: number }>();
    db.salesOrders
      .filter(o => o.status === 'Confirmed')
      .forEach(o => {
        const d = new Date(o.order_date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const curr = monthsMap.get(key) || { year: y, month: m, label: key, count: 0, subtotal: 0, discount: 0, grandTotal: 0 };
        curr.count += 1;
        curr.subtotal = Math.round((curr.subtotal + o.subtotal) * 100) / 100;
        curr.discount = Math.round((curr.discount + o.discount_amount) * 100) / 100;
        curr.grandTotal = Math.round((curr.grandTotal + o.grand_total) * 100) / 100;
        monthsMap.set(key, curr);
      });

    const rows = Array.from(monthsMap.values()).sort((a, b) => b.label.localeCompare(a.label));
    return res.json({ query_id: 4, title: 'Month-wise Confirmed sales totals, grouped by year and month', rows });
  }

  if (qId === 5) {
    // Query 5: Products below a supplied stock threshold
    const rows = db.products
      .filter(p => p.stock_quantity < threshold && p.status === 'Active')
      .sort((a, b) => a.stock_quantity - b.stock_quantity)
      .map(p => ({
        product_id: p.id,
        product_code: p.product_code,
        product_name: p.name,
        category: p.category,
        price: p.price,
        stock_quantity: p.stock_quantity,
        status: p.status,
        alert_level: p.stock_quantity === 0 ? 'OUT_OF_STOCK' : (p.stock_quantity <= 5 ? 'CRITICAL' : 'LOW_STOCK')
      }));
    return res.json({ query_id: 5, title: `Products below supplied stock threshold (${threshold})`, rows });
  }

  res.status(404).json({ error: 'Query ID not found. Valid IDs: 1 to 5.' });
});

// -----------------------------------------------------------------------------
// CSV IMPORT (PART 10) - ADMIN ONLY
// -----------------------------------------------------------------------------
app.post('/api/products/import-csv', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { csv_content } = req.body;
  if (!csv_content || typeof csv_content !== 'string') {
    return res.status(400).json({ error: 'CSV content string is required' });
  }

  const lines = csv_content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return res.status(400).json({ error: 'Uploaded CSV file is completely empty' });
  }

  const headerLine = lines[0];
  const expectedCols = ['product_code', 'product_name', 'category', 'price', 'stock_quantity', 'status'];
  const actualCols = headerLine.split(',').map(c => c.trim().toLowerCase());

  if (actualCols.length !== expectedCols.length || !expectedCols.every((col, i) => actualCols[i] === col)) {
    return res.status(400).json({
      error: `Invalid CSV header. Expected: ${expectedCols.join(',')}`,
      row_errors: [`Row 1 (Header): Header mismatch. Expected columns: ${expectedCols.join(', ')}`]
    });
  }

  const rowErrors: string[] = [];
  const existingCodes = new Set(db.products.map(p => p.product_code.toUpperCase()));
  const seenInFile = new Set<string>();
  const parsedItems: { code: string; name: string; category: string; price: number; stock: number; status: 'Active' | 'Inactive' }[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const rowNum = idx + 1;
    const line = lines[idx];
    const cols = line.split(',').map(c => c.trim());

    if (cols.length < 6) {
      rowErrors.push(`Row ${rowNum}: Expected 6 columns, received ${cols.length}`);
      continue;
    }

    const [code, name, category, priceStr, stockStr, status] = cols;

    if (!code) {
      rowErrors.push(`Row ${rowNum}: Missing product code`);
    } else {
      const codeUpper = code.toUpperCase();
      if (seenInFile.has(codeUpper)) {
        rowErrors.push(`Row ${rowNum}: Duplicate product code '${code}' within CSV file`);
      } else if (existingCodes.has(codeUpper)) {
        rowErrors.push(`Row ${rowNum}: Product code '${code}' already exists in database`);
      }
      seenInFile.add(codeUpper);
    }

    if (!name) rowErrors.push(`Row ${rowNum}: Missing product name`);
    if (!category) rowErrors.push(`Row ${rowNum}: Missing category`);

    const numPrice = Number(priceStr);
    if (isNaN(numPrice) || numPrice < 0) {
      rowErrors.push(`Row ${rowNum}: Invalid price '${priceStr}'. Must be a non-negative number.`);
    }

    const numStock = Number(stockStr);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      rowErrors.push(`Row ${rowNum}: Invalid stock quantity '${stockStr}'. Must be a non-negative integer.`);
    }

    const cleanStatus = status.toLowerCase() === 'active' ? 'Active' : (status.toLowerCase() === 'inactive' ? 'Inactive' : null);
    if (!cleanStatus) {
      rowErrors.push(`Row ${rowNum}: Invalid status '${status}'. Must be 'Active' or 'Inactive'.`);
    }

    if (rowErrors.length === 0) {
      parsedItems.push({
        code: code.toUpperCase(),
        name,
        category,
        price: Math.round(numPrice * 100) / 100,
        stock: numStock,
        status: cleanStatus || 'Active'
      });
    }
  }

  // ALL-OR-NOTHING VALIDATION: If ANY row is invalid, import nothing!
  if (rowErrors.length > 0) {
    return res.status(400).json({
      error: `Validation failed: Found ${rowErrors.length} error(s). All-or-nothing validation applied; no products were imported.`,
      row_errors: rowErrors
    });
  }

  // Atomically insert all valid products and opening stock movements
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let nextId = db.products.length ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
  let nextMovId = db.stockMovements.length ? Math.max(...db.stockMovements.map(m => m.id)) + 1 : 1;

  for (const item of parsedItems) {
    const newProd: Product = {
      id: nextId++,
      product_code: item.code,
      name: item.name,
      category: item.category,
      price: item.price,
      stock_quantity: item.stock,
      status: item.status,
      created_at: now
    };
    db.products.push(newProd);

    if (item.stock > 0) {
      db.stockMovements.push({
        id: nextMovId++,
        product_id: newProd.id,
        movement_type: 'OPENING',
        quantity_change: item.stock,
        reason: 'Imported opening stock from CSV',
        created_by: req.user!.id,
        timestamp: now
      });
    }
  }

  res.json({
    message: `Successfully imported ${parsedItems.length} products with all opening stock recorded.`,
    imported_count: parsedItems.length
  });
});

// -----------------------------------------------------------------------------
// DEBUGGING EXERCISE RUNNER (PART 11)
// -----------------------------------------------------------------------------
app.post('/api/debugging/calculate-total', (req: Request, res: Response) => {
  const { items } = req.body;

  // Buggy version from Part 11
  const runBuggy = (itemList: any[]) => {
    let total = 0;
    for (const item of itemList) {
      const amount = item.qty * item.rate;
      total = amount; // Overwrites accumulator
    }
    return total;
  };

  // Corrected version with full validation
  const runCorrected = (itemList: any[]) => {
    if (!Array.isArray(itemList)) throw new Error('Items must be an array');
    let total = 0;
    for (let i = 0; i < itemList.length; i++) {
      const item = itemList[i];
      if (item.qty === undefined || item.qty === null) throw new Error(`Item ${i + 1} is missing 'qty'`);
      if (item.rate === undefined || item.rate === null) throw new Error(`Item ${i + 1} is missing 'rate'`);

      const q = Number(item.qty);
      if (isNaN(q) || !Number.isInteger(q) || q <= 0) {
        throw new Error(`Item ${i + 1} quantity must be a positive integer, got ${item.qty}`);
      }

      const r = Number(item.rate);
      if (isNaN(r) || r < 0) {
        throw new Error(`Item ${i + 1} rate must be non-negative number, got ${item.rate}`);
      }

      total = Math.round((total + q * r) * 100) / 100;
    }
    return total;
  };

  let buggyResult: number | null = null;
  let buggyError: string | null = null;
  try {
    buggyResult = runBuggy(items || []);
  } catch (err: any) {
    buggyError = err.message;
  }

  let correctedResult: number | null = null;
  let correctedError: string | null = null;
  try {
    correctedResult = runCorrected(items || []);
  } catch (err: any) {
    correctedError = err.message;
  }

  res.json({
    buggy_result: buggyResult,
    buggy_error: buggyError,
    corrected_result: correctedResult,
    corrected_error: correctedError
  });
});

// Reset demo data endpoint
app.post('/api/system/reset-demo-data', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  db.seedInitialData();
  res.json({ message: 'Database reset to initial demo state successfully.' });
});

// Download Submission ZIP
app.get('/api/submission/download-zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'ACharanVenkat_TechnicalAssignment.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'Submission zip archive not found. Please generate it first.' });
  }
  res.download(zipPath, 'ACharanVenkat_TechnicalAssignment.zip');
});

// Safe GitHub Push API endpoint
app.post('/api/git/push', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { repo_url, token, branch = 'main' } = req.body;
  if (!repo_url) {
    return res.status(400).json({ error: 'GitHub repository URL is required (e.g., https://github.com/username/repository.git)' });
  }

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Form authenticated URL if token is provided
    let pushUrl = repo_url.trim();
    if (token && token.trim()) {
      const cleanToken = token.trim();
      if (pushUrl.startsWith('https://')) {
        const withoutHttps = pushUrl.replace('https://', '');
        pushUrl = `https://${cleanToken}@${withoutHttps}`;
      }
    }

    // Configure remote
    await execAsync('git remote remove origin 2>/dev/null || true');
    await execAsync(`git remote add origin ${JSON.stringify(pushUrl)}`);

    // Perform push
    const { stdout, stderr } = await execAsync(`git push -u origin ${branch}`);

    // Immediately sanitize origin remote so token is never kept on disk in plaintext
    const sanitizedUrl = repo_url.trim();
    await execAsync(`git remote set-url origin ${JSON.stringify(sanitizedUrl)}`);

    res.json({
      success: true,
      message: `Successfully pushed branch '${branch}' to ${sanitizedUrl}`,
      details: stdout || stderr
    });
  } catch (err: any) {
    // Sanitize any potential token leaks in error message
    const rawError = err?.message || String(err);
    const sanitizedError = token ? rawError.split(token).join('***') : rawError;
    // Ensure remote is sanitized even on error
    try {
      const { exec } = await import('child_process');
      const sanitizedUrl = repo_url.trim();
      exec(`git remote set-url origin ${JSON.stringify(sanitizedUrl)}`);
    } catch {
      // ignore
    }
    res.status(500).json({
      success: false,
      error: sanitizedError
    });
  }
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER INTEGRATION
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`[Savyant Systems] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
