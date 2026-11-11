import { Customer, Product, SalesOrder, StockMovement, CustomerSalesSummaryRow, ProductSalesSummaryRow } from './types';

let currentAuthToken = 'admin';
let currentUserId = 1;

export function setApiAuth(token: string, userId: number) {
  currentAuthToken = token;
  currentUserId = userId;
}

export function getApiAuth() {
  return { token: currentAuthToken, userId: currentUserId };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${currentAuthToken}`);
  headers.set('x-user-id', String(currentUserId));

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP error ${response.status}`;
    const err = new Error(errorMsg) as Error & { row_errors?: string[]; status?: number };
    err.row_errors = data.row_errors;
    err.status = response.status;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  getMe: () => request<{ user: any }>('/api/auth/me'),

  // Products
  getProducts: (params?: { search?: string; category?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    return request<{ products: Product[] }>(`/api/products?${q.toString()}`);
  },
  createProduct: (product: Partial<Product>) => request<{ product: Product; message: string }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product)
  }),
  updateProduct: (id: number, product: Partial<Product>) => request<{ product: Product; message: string }>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  }),
  deleteProduct: (id: number) => request<{ message: string }>(`/api/products/${id}`, {
    method: 'DELETE'
  }),
  adjustStock: (payload: { product_id: number; quantity_change: number; reason: string }) => request<{ message: string; new_stock: number; movement: StockMovement }>('/api/stock-adjustments', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Customers
  getCustomers: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    return request<{ customers: Customer[] }>(`/api/customers?${q.toString()}`);
  },
  createCustomer: (customer: Partial<Customer>) => request<{ customer: Customer; message: string }>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(customer)
  }),
  updateCustomer: (id: number, customer: Partial<Customer>) => request<{ customer: Customer; message: string }>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer)
  }),
  deleteCustomer: (id: number) => request<{ message: string }>(`/api/customers/${id}`, {
    method: 'DELETE'
  }),

  // Orders
  getOrders: (params?: { status?: string; customer_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.customer_id) q.set('customer_id', String(params.customer_id));
    return request<{ orders: SalesOrder[] }>(`/api/orders?${q.toString()}`);
  },
  getOrder: (id: number) => request<{ order: SalesOrder }>(`/api/orders/${id}`),
  createOrder: (payload: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => request<{ order: SalesOrder; message: string }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateDraftOrder: (id: number, payload: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => request<{ order: SalesOrder; message: string }>(`/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  confirmOrder: (id: number) => request<{ message: string; status: string; already_confirmed: boolean }>(`/api/orders/${id}/confirm`, {
    method: 'POST'
  }),
  cancelOrder: (id: number) => request<{ message: string; status: string; already_cancelled: boolean }>(`/api/orders/${id}/cancel`, {
    method: 'POST'
  }),

  // Stock movements
  getStockMovements: (productId?: number) => {
    const q = productId ? `?product_id=${productId}` : '';
    return request<{ stock_movements: StockMovement[] }>(`/api/stock-movements${q}`);
  },

  // Reports
  getCustomerSalesSummary: (params?: { from_date?: string; to_date?: string }) => {
    const q = new URLSearchParams();
    if (params?.from_date) q.set('from_date', params.from_date);
    if (params?.to_date) q.set('to_date', params.to_date);
    return request<{ report: CustomerSalesSummaryRow[] }>(`/api/reports/customer-sales?${q.toString()}`);
  },
  getProductSalesSummary: () => request<{ report: ProductSalesSummaryRow[] }>('/api/reports/product-sales'),
  getLowStockReport: (threshold = 10) => request<{ threshold: number; report: Product[] }>(`/api/reports/low-stock?threshold=${threshold}`),
  runSqlQuery: (queryId: number, threshold = 10) => request<{ query_id: number; title: string; rows: any[] }>(`/api/reports/sql-queries/${queryId}?threshold=${threshold}`),

  // CSV Import
  importProductsCsv: (csv_content: string) => request<{ message: string; imported_count: number }>('/api/products/import-csv', {
    method: 'POST',
    body: JSON.stringify({ csv_content })
  }),

  // Debugging Exercise Live Runner
  calculateTotalDebug: (items: any[]) => request<{ buggy_result: number | null; buggy_error: string | null; corrected_result: number | null; corrected_error: string | null }>('/api/debugging/calculate-total', {
    method: 'POST',
    body: JSON.stringify({ items })
  }),

  // Reset Demo Data
  resetDemoData: () => request<{ message: string }>('/api/system/reset-demo-data', {
    method: 'POST'
  })
};
