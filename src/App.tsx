/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, SalesOrder, Product, Customer, StockMovement } from './types';
import { api, setApiAuth } from './api';
import { Header } from './components/Header';
import { OrdersTab } from './components/OrdersTab';
import { ProductsTab } from './components/ProductsTab';
import { CustomersTab } from './components/CustomersTab';
import { StockLedgerTab } from './components/StockLedgerTab';
import { ReportsTab } from './components/ReportsTab';
import { CsvImportTab } from './components/CsvImportTab';
import { DebuggingTab } from './components/DebuggingTab';
import { DeliverablesTab } from './components/DeliverablesTab';

export default function App() {
  const availableUsers: User[] = [
    { id: 1, name: 'Admin User', email: 'admin@savyant.com', role: 'ADMIN' },
    { id: 2, name: 'John Sales', email: 'john.sales@savyant.com', role: 'SALES_USER' },
    { id: 3, name: 'Emma Sales', email: 'emma.sales@savyant.com', role: 'SALES_USER' },
  ];

  const [currentUser, setCurrentUser] = useState<User>(availableUsers[0]);
  const [activeTab, setActiveTab] = useState<string>('orders');

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, prodsRes, custsRes, movsRes] = await Promise.all([
        api.getOrders(),
        api.getProducts(),
        api.getCustomers(),
        api.getStockMovements(),
      ]);
      setOrders(ordersRes.orders);
      setProducts(prodsRes.products);
      setCustomers(custsRes.customers);
      setMovements(movsRes.stock_movements);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync current user with API auth
    const token = currentUser.id === 1 ? 'admin' : (currentUser.id === 2 ? 'sales-john' : 'sales-emma');
    setApiAuth(token, currentUser.id);
    loadData();
  }, [currentUser, loadData]);

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    const token = user.id === 1 ? 'admin' : (user.id === 2 ? 'sales-john' : 'sales-emma');
    setApiAuth(token, user.id);
    showToast(`Switched active session to ${user.name} (${user.role})`);
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset database to pristine demo data? All temporary records will be cleared.')) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetDemoData();
      await loadData();
      showToast('Database reset to initial assignment state.');
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setIsResetting(false);
    }
  };

  // Order Handlers
  const handleCreateOrder = async (orderData: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => {
    const res = await api.createOrder(orderData);
    showToast(`Order ${res.order.order_number} created as Draft`);
    await loadData();
  };

  const handleUpdateDraftOrder = async (id: number, orderData: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => {
    const res = await api.updateDraftOrder(id, orderData);
    showToast(`Order ${res.order.order_number} updated`);
    await loadData();
  };

  const handleConfirmOrder = async (id: number) => {
    const res = await api.confirmOrder(id);
    showToast(res.message);
    await loadData();
  };

  const handleCancelOrder = async (id: number) => {
    const res = await api.cancelOrder(id);
    showToast(res.message);
    await loadData();
  };

  // Product Handlers
  const handleCreateProduct = async (productData: Partial<Product>) => {
    const res = await api.createProduct(productData);
    showToast(res.message);
    await loadData();
  };

  const handleUpdateProduct = async (id: number, productData: Partial<Product>) => {
    const res = await api.updateProduct(id, productData);
    showToast(res.message);
    await loadData();
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await api.deleteProduct(id);
    showToast(res.message);
    await loadData();
  };

  const handleAdjustStock = async (payload: { product_id: number; quantity_change: number; reason: string }) => {
    const res = await api.adjustStock(payload);
    showToast(res.message);
    await loadData();
  };

  // Customer Handlers
  const handleCreateCustomer = async (custData: Partial<Customer>) => {
    const res = await api.createCustomer(custData);
    showToast(res.message);
    await loadData();
  };

  const handleUpdateCustomer = async (id: number, custData: Partial<Customer>) => {
    const res = await api.updateCustomer(id, custData);
    showToast(res.message);
    await loadData();
  };

  const handleDeleteCustomer = async (id: number) => {
    const res = await api.deleteCustomer(id);
    showToast(res.message);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Toast alert banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 border border-amber-400 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with role switch and navigation */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        availableUsers={availableUsers}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Initializing Savyant Systems Enterprise Engine...</p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                customers={customers}
                products={products}
                currentUser={currentUser}
                onRefreshOrders={loadData}
                onCreateOrder={handleCreateOrder}
                onUpdateDraftOrder={handleUpdateDraftOrder}
                onConfirmOrder={handleConfirmOrder}
                onCancelOrder={handleCancelOrder}
              />
            )}

            {activeTab === 'inventory' && (
              <ProductsTab
                products={products}
                currentUser={currentUser}
                onRefreshProducts={loadData}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAdjustStock={handleAdjustStock}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersTab
                customers={customers}
                currentUser={currentUser}
                onRefreshCustomers={loadData}
                onCreateCustomer={handleCreateCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}

            {activeTab === 'ledger' && (
              <StockLedgerTab
                movements={movements}
                onRefreshMovements={loadData}
              />
            )}

            {activeTab === 'reports' && <ReportsTab />}

            {activeTab === 'csv' && (
              <CsvImportTab
                currentUser={currentUser}
                onImportSuccess={loadData}
              />
            )}

            {activeTab === 'debugging' && <DebuggingTab />}

            {activeTab === 'deliverables' && <DeliverablesTab />}
          </>
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-slate-200">SAVYANT SYSTEMS</span>
            <span>•</span>
            <span>Technical Assignment: Sales Order &amp; Inventory Management</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Submission: <strong className="text-amber-400/90 font-mono">ACharanVenkat_TechnicalAssignment</strong></span>
            <span>•</span>
            <span>CONFIDENTIAL 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
