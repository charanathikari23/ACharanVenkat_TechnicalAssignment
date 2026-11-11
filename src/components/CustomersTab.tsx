import React, { useState } from 'react';
import { Customer, User } from '../types';
import { Plus, Search, Edit, Trash2, AlertCircle, X, Mail, Phone, MapPin } from 'lucide-react';

interface CustomersTabProps {
  customers: Customer[];
  currentUser: User;
  onRefreshCustomers: () => void;
  onCreateCustomer: (customer: Partial<Customer>) => Promise<void>;
  onUpdateCustomer: (id: number, customer: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: number) => Promise<void>;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  currentUser,
  onRefreshCustomers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    city: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [safeDeleteWarning, setSafeDeleteWarning] = useState<{ id: number; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';

  const filteredCustomers = customers.filter(c => {
    const s = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.mobile.includes(s) ||
      c.city.toLowerCase().includes(s);
    const matchStatus = !statusFilter || c.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      mobile: '',
      city: '',
      status: 'Active',
    });
    setModalError(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      city: c.city,
      status: c.status,
    });
    setModalError(null);
    setIsAddEditOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.name.trim()) return setModalError('Customer name is required');
    if (!formData.email.trim()) return setModalError('Customer email is required');
    if (!formData.mobile.trim()) return setModalError('Mobile number is required');
    if (!formData.city.trim()) return setModalError('City is required');

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await onUpdateCustomer(editingCustomer.id, formData);
      } else {
        await onCreateCustomer(formData);
      }
      setIsAddEditOpen(false);
      onRefreshCustomers();
    } catch (err: any) {
      setModalError(err.message || 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (c: Customer) => {
    setSafeDeleteWarning(null);
    try {
      await onDeleteCustomer(c.id);
      onRefreshCustomers();
    } catch (err: any) {
      setSafeDeleteWarning({ id: c.id, message: err.message });
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await onUpdateCustomer(id, { status: 'Inactive' });
      setSafeDeleteWarning(null);
      onRefreshCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-serif">Customer Master Data</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin
                ? 'Admin Master Control: Create, edit, and safely manage client accounts'
                : 'Sales Rep View: Active customer records available for order placement'}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, mobile, or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
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
              <p className="font-semibold text-amber-300">Customer Cannot Be Deleted (Safe Deletion Rule)</p>
              <p className="mt-0.5 leading-relaxed">{safeDeleteWarning.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleDeactivate(safeDeleteWarning.id)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
            >
              Deactivate Instead
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

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">City</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-center">Admin Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-500">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono">{c.mobile}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.city}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          c.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className={c.status === 'Active' ? 'text-slate-200' : 'text-slate-500'}>
                        {c.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Delete customer (safe check)"
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

      {/* Add / Edit Customer Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 font-serif">
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
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

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Customer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. orders@acmecorp.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Mobile <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+1-555-0199"
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    City <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dallas"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
