import React from 'react';
import { User } from '../types';
import { Shield, UserCheck, RefreshCw, Layers, ShoppingBag, Package, Users, FileText, UploadCloud, Bug, CheckSquare } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onResetData: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  availableUsers,
  activeTab,
  onTabChange,
  onResetData,
  isResetting,
}) => {
  const tabs = [
    { id: 'orders', label: 'Sales Orders', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory & Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'ledger', label: 'Stock Movement Ledger', icon: Layers },
    { id: 'reports', label: 'Reports & SQL', icon: FileText },
    { id: 'csv', label: 'CSV Bulk Import', icon: UploadCloud },
    { id: 'debugging', label: 'Part 11 Debugging', icon: Bug },
    { id: 'deliverables', label: 'Assignment Deliverables', icon: CheckSquare },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-xl sticky top-0 z-40">
      {/* Brand & Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-amber-400 font-serif font-black text-xl tracking-tighter">S∞</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-wider text-slate-100 font-serif">SAVYANT</span>
                <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold px-1.5 py-0.5 bg-amber-950/60 rounded border border-amber-500/30">
                  SYSTEMS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Sales Order &amp; Inventory Management</p>
            </div>
          </div>

          {/* Right Action Controls: Role Switcher & Reset */}
          <div className="flex items-center space-x-3">
            {/* Role Switcher */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700/80 text-xs">
              <span className="px-2 text-slate-400 font-medium hidden md:inline">Simulate User:</span>
              {availableUsers.map((u) => {
                const isActive = currentUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => onSwitchUser(u)}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center space-x-1 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                    title={`${u.name} (${u.role}) - ${u.email}`}
                  >
                    {u.role === 'ADMIN' ? (
                      <Shield className="w-3.5 h-3.5" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{u.name.split(' ')[0]}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded ${isActive ? 'bg-slate-950/20' : 'bg-slate-900/60 text-slate-400'}`}>
                      {u.role === 'ADMIN' ? 'Admin' : 'Sales'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Reset Demo Data button */}
            <button
              onClick={onResetData}
              disabled={isResetting}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition"
              title="Reset data store to pristine demo state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : ''}`} />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-950/70 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
