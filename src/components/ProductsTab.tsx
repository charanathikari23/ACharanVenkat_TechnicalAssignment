import React, { useState } from 'react';
import { Product, User } from '../types';
import { Plus, Search, Filter, Edit, Trash2, Sliders, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ProductsTabProps {
  products: Product[];
  currentUser: User;
  onRefreshProducts: () => void;
  onCreateProduct: (product: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  onAdjustStock: (payload: { product_id: number; quantity_change: number; reason: string }) => Promise<void>;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  currentUser,
  onRefreshProducts,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    status: 'Active' as 'Active' | 'Inactive',
  });

  // Adjust stock modal state
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustChange, setAdjustChange] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Error / message states
  const [modalError, setModalError] = useState<string | null>(null);
  const [safeDeleteWarning, setSafeDeleteWarning] = useState<{ id: number; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const filteredProducts = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchStatus = !statusFilter || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchCategory && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      product_code: '',
      name: '',
      category: categories[0] || 'Hardware',
      price: 0,
      stock_quantity: 0,
      status: 'Active',
    });
    setModalError(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      product_code: p.product_code,
      name: p.name,
      category: p.category,
      price: p.price,
      stock_quantity: p.stock_quantity,
      status: p.status,
    });
    setModalError(null);
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.product_code.trim()) {
      setModalError('Product code is required');
      return;
    }
    if (!formData.name.trim()) {
      setModalError('Product name is required');
      return;
    }
    if (formData.price < 0) {
      setModalError('Price cannot be negative');
      return;
    }
    if (formData.stock_quantity < 0 || !Number.isInteger(formData.stock_quantity)) {
      setModalError('Stock quantity must be a non-negative whole number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formData);
      } else {
        await onCreateProduct(formData);
      }
      setIsAddEditOpen(false);
      onRefreshProducts();
    } catch (err: any) {
      setModalError(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (p: Product) => {
    setSafeDeleteWarning(null);
    try {
      await onDeleteProduct(p.id);
      onRefreshProducts();
    } catch (err: any) {
      // If safe deletion prevented it, show option to deactivate
      setSafeDeleteWarning({ id: p.id, message: err.message });
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await onUpdateProduct(id, { status: 'Inactive' });
      setSafeDeleteWarning(null);
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecuteStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    setModalError(null);

    if (adjustChange === 0) {
      setModalError('Adjustment quantity cannot be 0');
      return;
    }
    if (!adjustReason.trim()) {
      setModalError('Adjustment reason is mandatory');
      return;
    }

    const projected = adjustModalProduct.stock_quantity + adjustChange;
    if (projected < 0) {
      setModalError(`Adjustment would result in negative stock (${projected}). Rejected.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdjustStock({
        product_id: adjustModalProduct.id,
        quantity_change: adjustChange,
        reason: adjustReason.trim(),
      });
      setAdjustModalProduct(null);
      onRefreshProducts();
    } catch (err: any) {
      setModalError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-serif">Product &amp; Inventory Master</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin
                ? 'Admin Master Control: Maintain catalog, create products, adjust inventory with reason'
                : 'Sales Catalog View: Read-only access to available products & active stock'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Safe Deletion Conflict Notification */}
      {safeDeleteWarning && (
        <div className="p-4 bg-amber-950/80 border border-amber-500/50 rounded-2xl text-xs text-amber-200 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Safe Deletion Policy Triggered</p>
              <p className="mt-0.5 leading-relaxed">{safeDeleteWarning.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleDeactivate(safeDeleteWarning.id)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
            >
              Deactivate Product
            </button>
            <button
              onClick={() => setSafeDeleteWarning(null)}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4 text-center">Stock Quantity</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-center">Admin Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {p.product_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                          p.stock_quantity === 0
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : p.stock_quantity <= 5
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          p.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className={p.status === 'Active' ? 'text-slate-200' : 'text-slate-500'}>
                        {p.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Stock adjustment */}
                          <button
                            onClick={() => {
                              setAdjustModalProduct(p);
                              setAdjustChange(0);
                              setAdjustReason('');
                              setModalError(null);
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/50 transition"
                            title="Adjust stock (Admin only with mandatory reason)"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteClick(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Safe delete (deactivates if referenced)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 font-serif">
                {editingProduct ? `Edit Product: ${editingProduct.product_code}` : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Product Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRD-007"
                  value={formData.product_code}
                  onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Product Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dual-Band WiFi 6 Router"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Networking"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Unit Price ($) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    {editingProduct ? 'Current Stock (Read-only)' : 'Initial Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!!editingProduct}
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500 ${
                      editingProduct ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-slate-400">Use 'Adjust Stock' tool to modify inventory</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal (Part 6) */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-100 font-serif">Manual Stock Adjustment</h3>
                <p className="text-xs text-slate-400">
                  {adjustModalProduct.name} ({adjustModalProduct.product_code})
                </p>
              </div>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
              <span className="text-slate-400">Current Stock Quantity:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {adjustModalProduct.stock_quantity} units
              </span>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteStockAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Quantity Change (+ to add, - to reduce) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. +10 or -3"
                  value={adjustChange || ''}
                  onChange={e => setAdjustChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Resulting Stock:{' '}
                  <strong className={adjustModalProduct.stock_quantity + adjustChange < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {adjustModalProduct.stock_quantity + adjustChange}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Mandatory Reason <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory count discrepancy / Damaged stock write-off"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow"
                >
                  {isSubmitting ? 'Recording...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
