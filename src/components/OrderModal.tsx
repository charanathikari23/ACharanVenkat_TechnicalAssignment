import React, { useState, useEffect } from 'react';
import { Customer, Product, SalesOrder } from '../types';
import { Plus, Trash2, AlertCircle, X, Calculator, CheckCircle2 } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => Promise<void>;
  customers: Customer[];
  products: Product[];
  editingOrder?: SalesOrder | null;
}

interface OrderFormItem {
  product_id: number;
  quantity: number;
  rate: number;
  amount: number;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  products,
  editingOrder,
}) => {
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [items, setItems] = useState<OrderFormItem[]>([
    { product_id: 0, quantity: 1, rate: 0, amount: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only Active customers and products (assignment requirement: select active customer and active products)
  const activeCustomers = customers.filter(c => c.status === 'Active');
  const activeProducts = products.filter(p => p.status === 'Active');

  useEffect(() => {
    if (editingOrder) {
      setCustomerId(editingOrder.customer_id);
      setDiscountPercentage(editingOrder.discount_percentage);
      if (editingOrder.items && editingOrder.items.length > 0) {
        setItems(
          editingOrder.items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            rate: i.rate,
            amount: Math.round(i.quantity * i.rate * 100) / 100,
          }))
        );
      }
    } else {
      setCustomerId(activeCustomers.length > 0 ? activeCustomers[0].id : '');
      setDiscountPercentage(0);
      setItems([
        {
          product_id: activeProducts.length > 0 ? activeProducts[0].id : 0,
          quantity: 1,
          rate: activeProducts.length > 0 ? activeProducts[0].price : 0,
          amount: activeProducts.length > 0 ? activeProducts[0].price : 0,
        },
      ]);
    }
    setError(null);
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, prodId: number) => {
    const selectedProd = products.find(p => p.id === prodId);
    const rate = selectedProd ? selectedProd.price : 0;
    const updated = [...items];
    const qty = updated[index].quantity;
    updated[index] = {
      product_id: prodId,
      quantity: qty,
      rate,
      amount: Math.round(qty * rate * 100) / 100,
    };
    setItems(updated);
    setError(null);
  };

  const handleQuantityChange = (index: number, val: string) => {
    const qty = parseInt(val, 10) || 0;
    const updated = [...items];
    const rate = updated[index].rate;
    updated[index] = {
      ...updated[index],
      quantity: qty,
      amount: Math.round(qty * rate * 100) / 100,
    };
    setItems(updated);
    setError(null);
  };

  const addItemRow = () => {
    // Find first unused active product if possible
    const usedIds = new Set(items.map(i => i.product_id));
    const available = activeProducts.find(p => !usedIds.has(p.id)) || activeProducts[0];
    const prodId = available ? available.id : 0;
    const rate = available ? available.price : 0;

    setItems([...items, { product_id: prodId, quantity: 1, rate, amount: rate }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setError('An order must contain at least one item');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Live Calculations (Part 5 & Part 7)
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;
  const discountAmount = Math.round(((subtotal * (discountPercentage || 0)) / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (items.length === 0) {
      setError('Order must contain at least one product');
      return;
    }

    const seenProducts = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_id || it.product_id === 0) {
        setError(`Please select a valid product for row ${i + 1}`);
        return;
      }
      if (seenProducts.has(it.product_id)) {
        const prod = products.find(p => p.id === it.product_id);
        setError(`Duplicate product '${prod?.name || it.product_id}' is not allowed in the same order.`);
        return;
      }
      seenProducts.add(it.product_id);

      if (it.quantity <= 0 || !Number.isInteger(it.quantity)) {
        setError(`Row ${i + 1}: Quantity must be a positive whole number greater than 0.`);
        return;
      }
    }

    if (discountPercentage < 0 || discountPercentage > 20) {
      setError('Discount percentage must be between 0% and 20%');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        customer_id: Number(customerId),
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount_percentage: Number(discountPercentage),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif">
              {editingOrder ? `Edit Draft Order: ${editingOrder.order_number}` : 'Create New Sales Order'}
            </h2>
            <p className="text-xs text-slate-400">
              Rates are fetched from master data and frozen on the order. Stock is deducted upon confirmation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Customer <span className="text-rose-400">*</span>
              </label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
              >
                <option value="">Select an active customer...</option>
                {activeCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.city} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Discount Percentage (0% to 20%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={discountPercentage}
                  onChange={e => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition pr-10"
                />
                <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm font-semibold">%</span>
              </div>
            </div>
          </div>

          {/* Dynamic Item Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Order Items (Multiple Products)
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Product (Available Stock)</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Rate ($)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Amount ($)</th>
                    <th className="py-2.5 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {items.map((item, idx) => {
                    const prod = products.find(p => p.id === item.product_id);
                    const stock = prod ? prod.stock_quantity : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <select
                            value={item.product_id}
                            onChange={e => handleProductChange(idx, Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                          >
                            <option value={0}>Choose a product...</option>
                            {activeProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.product_code}: {p.name} — ${p.price.toFixed(2)} (Stock: {p.stock_quantity})
                              </option>
                            ))}
                          </select>
                          {prod && (
                            <div className="flex items-center space-x-2 mt-1 text-[11px]">
                              <span className="text-slate-400">Category: {prod.category}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-medium ${
                                  stock <= 0
                                    ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                    : stock <= 5
                                    ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {stock <= 0 ? 'Out of Stock' : `Available: ${stock} in stock`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={e => handleQuantityChange(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          ${item.rate.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-100">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className={`p-1.5 rounded-lg transition ${
                              items.length <= 1
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                            title="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Financial Calculations Card (Part 5) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-slate-400 text-xs">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Financial Summary (Auto-computed, rounded to 2 decimals)</span>
            </div>
            <div className="w-full sm:w-auto flex flex-col space-y-1.5 text-right font-mono text-xs">
              <div className="flex justify-between sm:justify-end space-x-6">
                <span className="text-slate-400 font-sans">Subtotal:</span>
                <span className="text-slate-200 font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between sm:justify-end space-x-6">
                <span className="text-slate-400 font-sans">Discount ({discountPercentage}%):</span>
                <span className="text-rose-400">-${discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between sm:justify-end space-x-6 pt-1 border-t border-slate-800">
                <span className="text-amber-400 font-bold font-sans text-sm">Grand Total:</span>
                <span className="text-amber-400 font-bold text-base">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingOrder ? 'Update Draft Order' : 'Save as Draft Order'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
