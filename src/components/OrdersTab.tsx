import React, { useState } from 'react';
import { SalesOrder, Customer, Product, User } from '../types';
import { Plus, Eye, CheckCircle, XCircle, AlertTriangle, ShieldAlert, Edit, ShoppingCart } from 'lucide-react';
import { OrderModal } from './OrderModal';

interface OrdersTabProps {
  orders: SalesOrder[];
  customers: Customer[];
  products: Product[];
  currentUser: User;
  onRefreshOrders: () => void;
  onCreateOrder: (orderData: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => Promise<void>;
  onUpdateDraftOrder: (id: number, orderData: { customer_id: number; items: { product_id: number; quantity: number }[]; discount_percentage: number }) => Promise<void>;
  onConfirmOrder: (id: number) => Promise<void>;
  onCancelOrder: (id: number) => Promise<void>;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  customers,
  products,
  currentUser,
  onRefreshOrders,
  onCreateOrder,
  onUpdateDraftOrder,
  onConfirmOrder,
  onCancelOrder,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SalesOrder | null>(null);

  // Dialog states for Part 7 (Confirmation dialog: Ask before confirming or cancelling an order)
  const [confirmDialogOrder, setConfirmDialogOrder] = useState<SalesOrder | null>(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<SalesOrder | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'ALL') return true;
    return o.status.toUpperCase() === statusFilter;
  });

  const handleOpenConfirmDialog = (order: SalesOrder) => {
    setActionError(null);
    setConfirmDialogOrder(order);
  };

  const handleOpenCancelDialog = (order: SalesOrder) => {
    setActionError(null);
    setCancelDialogOrder(order);
  };

  const executeConfirm = async () => {
    if (!confirmDialogOrder) return;
    setIsActionProcessing(true);
    setActionError(null);
    try {
      await onConfirmOrder(confirmDialogOrder.id);
      setConfirmDialogOrder(null);
      onRefreshOrders();
    } catch (err: any) {
      setActionError(err.message || 'Confirmation failed');
    } finally {
      setIsActionProcessing(false);
    }
  };

  const executeCancel = async () => {
    if (!cancelDialogOrder) return;
    setIsActionProcessing(true);
    setActionError(null);
    try {
      await onCancelOrder(cancelDialogOrder.id);
      setCancelDialogOrder(null);
      onRefreshOrders();
    } catch (err: any) {
      setActionError(err.message || 'Cancellation failed');
    } finally {
      setIsActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-serif">Sales Order Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentUser.role === 'ADMIN'
              ? 'Administrator View: Manage and confirm orders across all company accounts'
              : `Sales Rep View (${currentUser.name}): Viewing and managing your assigned orders`}
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Status filter tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingOrder(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Order Number</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">Discount</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4">Created By</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-medium">No sales orders found matching filter '{statusFilter}'</p>
                    <p className="text-[11px] mt-1 text-slate-600">Click 'New Order' above to create one.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isOwner = currentUser.role === 'ADMIN' || order.created_by === currentUser.id;
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {order.order_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {order.customer_name || `Customer #${order.customer_id}`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {order.order_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            order.status === 'Confirmed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'Draft'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        ${order.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {order.discount_percentage > 0 ? (
                          <span className="text-rose-400/90">
                            -${order.discount_amount.toFixed(2)} ({order.discount_percentage}%)
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 text-sm">
                        ${order.grand_total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="flex items-center space-x-1">
                          <span>{order.created_by_name || `User #${order.created_by}`}</span>
                          {order.created_by === currentUser.id && (
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-semibold">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="View order details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit (Draft only, and owner or admin) */}
                          {order.status === 'Draft' && isOwner && (
                            <button
                              onClick={() => {
                                setEditingOrder(order);
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 transition"
                              title="Edit draft order"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Confirm order (Draft only) */}
                          {order.status === 'Draft' && isOwner && (
                            <button
                              onClick={() => handleOpenConfirmDialog(order)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition"
                              title="Confirm order & deduct stock"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel order (Draft or Confirmed) */}
                          {order.status !== 'Cancelled' && isOwner && (
                            <button
                              onClick={() => handleOpenCancelDialog(order)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition"
                              title="Cancel order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog Modal (Part 7: Ask before confirming an order) */}
      {confirmDialogOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-500/30">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 font-serif">Confirm Sales Order</h3>
                <p className="text-xs text-slate-400 font-mono">{confirmDialogOrder.order_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to confirm this order for <strong className="text-white">${confirmDialogOrder.grand_total.toFixed(2)}</strong>?
              This action will check stock availability and <strong className="text-amber-400">deduct inventory items</strong> in an atomic transaction. Confirmed orders cannot be edited.
            </p>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmDialogOrder(null)}
                disabled={isActionProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Go Back
              </button>
              <button
                onClick={executeConfirm}
                disabled={isActionProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition disabled:opacity-50 flex items-center space-x-2"
              >
                {isActionProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Yes, Confirm Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Dialog Modal (Part 7: Ask before cancelling an order) */}
      {cancelDialogOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-950/80 rounded-xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100 font-serif">Cancel Sales Order</h3>
                <p className="text-xs text-slate-400 font-mono">{cancelDialogOrder.order_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel this order?
              {cancelDialogOrder.status === 'Confirmed' ? (
                <span className="block mt-1 text-amber-300 font-medium">
                  Because this order was Confirmed, cancelling it will automatically <strong className="text-amber-400">restore all deducted stock</strong> back to inventory.
                </span>
              ) : (
                <span className="block mt-1 text-slate-400">
                  Because this is a Draft order, no stock changes will occur.
                </span>
              )}
            </p>

            {actionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setCancelDialogOrder(null)}
                disabled={isActionProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Dismiss
              </button>
              <button
                onClick={executeCancel}
                disabled={isActionProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition disabled:opacity-50 flex items-center space-x-2"
              >
                {isActionProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-100 font-serif">
                  Order Details: {selectedOrderDetails.order_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Customer: {selectedOrderDetails.customer_name} • Date: {selectedOrderDetails.order_date}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedOrderDetails.status === 'Confirmed'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : selectedOrderDetails.status === 'Draft'
                    ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                }`}
              >
                {selectedOrderDetails.status}
              </span>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Frozen Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {selectedOrderDetails.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-200">
                        <span className="font-mono text-amber-400 mr-2">{it.product_code}</span>
                        <span>{it.product_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        ${it.rate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                        ${it.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-right font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Subtotal:</span>
                <span className="text-slate-200">${selectedOrderDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Discount ({selectedOrderDetails.discount_percentage}%):</span>
                <span className="text-rose-400">-${selectedOrderDetails.discount_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-sm">
                <span className="text-amber-400 font-sans">Grand Total:</span>
                <span className="text-amber-400">${selectedOrderDetails.grand_total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Order Modal */}
      <OrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={async data => {
          if (editingOrder) {
            await onUpdateDraftOrder(editingOrder.id, data);
          } else {
            await onCreateOrder(data);
          }
          onRefreshOrders();
        }}
        customers={customers}
        products={products}
        editingOrder={editingOrder}
      />
    </div>
  );
};
