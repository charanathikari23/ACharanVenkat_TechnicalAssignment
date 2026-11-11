import React, { useState, useEffect } from 'react';
import { CustomerSalesSummaryRow, ProductSalesSummaryRow, Product } from '../types';
import { api } from '../api';
import { FileText, Calendar, Filter, Terminal, AlertTriangle, TrendingUp, PackageCheck, Users } from 'lucide-react';

export const ReportsTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'customer_sales' | 'product_sales' | 'low_stock' | 'sql_queries'>('customer_sales');

  // Customer Sales Summary states
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [customerSales, setCustomerSales] = useState<CustomerSalesSummaryRow[]>([]);
  const [loadingCust, setLoadingCust] = useState(false);

  // Product Sales Summary states
  const [productSales, setProductSales] = useState<ProductSalesSummaryRow[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);

  // Low Stock states
  const [stockThreshold, setStockThreshold] = useState<number>(10);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(false);

  // Standalone SQL Queries state
  const [selectedQueryId, setSelectedQueryId] = useState<number>(1);
  const [queryResults, setQueryResults] = useState<{ query_id: number; title: string; rows: any[] } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);

  const sqlQueriesDefinitions = [
    {
      id: 1,
      title: 'Top three customers by Confirmed order grand total',
      sql: `SELECT 
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
LIMIT 3;`
    },
    {
      id: 2,
      title: 'Top three products by quantity sold in Confirmed orders',
      sql: `SELECT 
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
LIMIT 3;`
    },
    {
      id: 3,
      title: 'Customers who have never placed any order',
      sql: `SELECT 
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
ORDER BY c.name ASC;`
    },
    {
      id: 4,
      title: 'Month-wise Confirmed sales totals, grouped by year and month',
      sql: `SELECT 
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
    order_month DESC;`
    },
    {
      id: 5,
      title: 'Products below a supplied stock threshold (:threshold = 10)',
      sql: `SELECT 
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
ORDER BY p.stock_quantity ASC, p.name ASC;`
    }
  ];

  const fetchCustomerSales = async () => {
    setLoadingCust(true);
    try {
      const res = await api.getCustomerSalesSummary({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setCustomerSales(res.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCust(false);
    }
  };

  const fetchProductSales = async () => {
    setLoadingProd(true);
    try {
      const res = await api.getProductSalesSummary();
      setProductSales(res.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProd(false);
    }
  };

  const fetchLowStock = async () => {
    setLoadingLowStock(true);
    try {
      const res = await api.getLowStockReport(stockThreshold);
      setLowStockProducts(res.report);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLowStock(false);
    }
  };

  const fetchSqlQuery = async (queryId: number) => {
    setLoadingQuery(true);
    try {
      const res = await api.runSqlQuery(queryId, stockThreshold);
      setQueryResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuery(false);
    }
  };

  useEffect(() => {
    if (subTab === 'customer_sales') fetchCustomerSales();
    if (subTab === 'product_sales') fetchProductSales();
    if (subTab === 'low_stock') fetchLowStock();
    if (subTab === 'sql_queries') fetchSqlQuery(selectedQueryId);
  }, [subTab, selectedQueryId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <h1 className="text-xl font-bold text-slate-100 font-serif">Executive Reports &amp; SQL Engine</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Audited sales metrics based on Confirmed orders only, plus live execution of the five standalone assignment SQL queries.
        </p>

        {/* Sub tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSubTab('customer_sales')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'customer_sales'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Sales Summary</span>
          </button>

          <button
            onClick={() => setSubTab('product_sales')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'product_sales'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Product Sales Summary</span>
          </button>

          <button
            onClick={() => setSubTab('low_stock')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'low_stock'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alert</span>
          </button>

          <button
            onClick={() => setSubTab('sql_queries')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              subTab === 'sql_queries'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Standalone SQL Queries (5)</span>
          </button>
        </div>
      </div>

      {/* 1. Customer Sales Summary */}
      {subTab === 'customer_sales' && (
        <div className="space-y-4">
          {/* Date range filter card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 font-semibold">Order Date Range Filter:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchCustomerSales}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Apply Range
              </button>
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setTimeout(fetchCustomerSales, 10);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400">
            ℹ️ <strong className="text-slate-300">Requirement Check:</strong> Includes customers with 0 Confirmed orders in this date range showing zero totals. Accurate distinct counting ensures multi-item orders are counted exactly once.
          </div>

          {/* Customer Sales Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Confirmed Orders</th>
                    <th className="py-3.5 px-4 text-right">Total Sales (After Discount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingCust ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading summary report...</td>
                    </tr>
                  ) : (
                    customerSales.map(c => (
                      <tr key={c.customer_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-200">{c.customer_name}</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">{c.customer_email}</td>
                        <td className="py-3.5 px-4 text-slate-300">{c.customer_city}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                          {c.confirmed_orders_count}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                          ${c.total_sales_after_discount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Product Sales Summary */}
      {subTab === 'product_sales' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400">
            ℹ️ <strong className="text-slate-300">Requirement Check:</strong> Computes total units sold and gross sales value (`Quantity × Rate`) for Confirmed orders before order-level discounts.
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product Code</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Current Stock</th>
                    <th className="py-3.5 px-4 text-center">Units Sold (Confirmed)</th>
                    <th className="py-3.5 px-4 text-right">Gross Sales Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingProd ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading product sales...</td>
                    </tr>
                  ) : (
                    productSales.map(p => (
                      <tr key={p.product_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{p.product_code}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{p.product_name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{p.category}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300">{p.current_stock}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400 text-sm">
                          {p.quantity_sold}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                          ${p.gross_item_value_before_discount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Low Stock Report */}
      {subTab === 'low_stock' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center space-x-3 text-xs">
            <Filter className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-semibold">User-entered Stock Threshold:</span>
            <input
              type="number"
              min="0"
              value={stockThreshold}
              onChange={e => {
                const val = parseInt(e.target.value, 10) || 0;
                setStockThreshold(val);
              }}
              className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={fetchLowStock}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Update Alert Filter
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product Code</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Price</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-center">Urgency Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingLowStock ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Evaluating inventory...</td>
                    </tr>
                  ) : lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-emerald-400 font-medium">
                        All active products have stock quantities equal to or greater than {stockThreshold}.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{p.product_code}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{p.category}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">${p.price.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-rose-400">
                          {p.stock_quantity}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.stock_quantity === 0
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                : p.stock_quantity <= 5
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                                : 'bg-yellow-950 text-yellow-400 border border-yellow-500/40'
                            }`}
                          >
                            {p.stock_quantity === 0 ? 'OUT OF STOCK' : (p.stock_quantity <= 5 ? 'CRITICAL LOW' : 'LOW STOCK')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Standalone SQL Queries Explorer */}
      {subTab === 'sql_queries' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Query selector buttons */}
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Select Standalone Query to Inspect:
              </label>
              {sqlQueriesDefinitions.map(q => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueryId(q.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-start space-x-2.5 ${
                    selectedQueryId === q.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 shrink-0">
                    Q{q.id}
                  </span>
                  <span className="font-medium leading-snug">{q.title}</span>
                </button>
              ))}
            </div>

            {/* SQL Code & Live Result Output */}
            <div className="lg:col-span-3 space-y-4">
              {/* SQL Syntax Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-xs">
                  <span className="font-bold text-amber-400 font-mono">
                    SQL Statement: queries.sql (Query {selectedQueryId})
                  </span>
                  <span className="text-[11px] text-slate-500">MySQL &amp; ANSI SQL Standard</span>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  {sqlQueriesDefinitions.find(q => q.id === selectedQueryId)?.sql}
                </pre>
              </div>

              {/* Result Preview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-slate-950 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-200">
                    Live Query Result Set ({queryResults?.rows.length || 0} rows returned)
                  </span>
                  <button
                    onClick={() => fetchSqlQuery(selectedQueryId)}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Re-execute Query
                  </button>
                </div>

                <div className="overflow-x-auto max-h-80">
                  {loadingQuery ? (
                    <div className="p-8 text-center text-xs text-slate-400">Executing SQL on database...</div>
                  ) : !queryResults || queryResults.rows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No rows returned.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                          {Object.keys(queryResults.rows[0]).map(col => (
                            <th key={col} className="py-2.5 px-3">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {queryResults.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/30">
                            {Object.values(row).map((val: any, cIdx) => (
                              <td key={cIdx} className="py-2.5 px-3 text-slate-200">
                                {typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(2) : val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
