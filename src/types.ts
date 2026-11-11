export interface User {
  id: number;
  name: string;
  email: string;
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
  id?: number;
  sales_order_id?: number;
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
  items_count?: number;
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

export interface CustomerSalesSummaryRow {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_city: string;
  status: string;
  confirmed_orders_count: number;
  total_sales_after_discount: number;
}

export interface ProductSalesSummaryRow {
  product_id: number;
  product_code: string;
  product_name: string;
  category: string;
  current_stock: number;
  quantity_sold: number;
  gross_item_value_before_discount: number;
}
