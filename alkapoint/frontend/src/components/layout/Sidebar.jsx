import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  HomeIcon, ShoppingCartIcon, CubeIcon, UsersIcon, CreditCardIcon,
  BanknotesIcon, ChartBarIcon, Cog6ToothIcon, TagIcon, TruckIcon,
  BuildingStorefrontIcon, UserGroupIcon, ClipboardDocumentListIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const groups = [
  {
    key: 'overview', label: 'Overview', module: null,
    items: [{ name: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
  },
  {
    key: 'pos', label: 'Alkantra POS', module: 'POS',
    items: [
      { name: 'Point of Sale', to: '/pos', icon: ShoppingCartIcon },
      { name: 'Sales', to: '/sales', icon: ClipboardDocumentListIcon },
    ],
  },
  {
    key: 'inventory', label: 'Alkantra Inventory', module: 'Inventory',
    items: [
      { name: 'Products', to: '/products', icon: CubeIcon },
      { name: 'Categories', to: '/categories', icon: TagIcon },
      { name: 'Stock', to: '/inventory', icon: BuildingStorefrontIcon },
      { name: 'Purchases', to: '/purchases', icon: TruckIcon },
    ],
  },
  {
    key: 'customers', label: 'Customers', module: null,
    items: [
      { name: 'Customers', to: '/customers', icon: UsersIcon },
      { name: 'Debtors', to: '/debtors', icon: CreditCardIcon },
    ],
  },
  {
    key: 'payments', label: 'Alkantra Payments', module: 'Payments',
    items: [
      { name: 'Payments', to: '/payments', icon: BanknotesIcon },
      { name: 'Expenses', to: '/expenses', icon: BanknotesIcon },
    ],
  },
  {
    key: 'business', label: 'Alkantra Business', module: 'Business',
    items: [
      { name: 'Partners', to: '/partners', icon: UserGroupIcon },
      { name: 'Reports', to: '/reports', icon: ChartBarIcon },
      { name: 'Roles', to: '/roles', icon: ShieldCheckIcon },
      { name: 'Settings', to: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const [open, setOpen] = useState({
    overview: true, pos: true, inventory: true,
    customers: true, payments: true, business: true,
  });

  const toggle = (key) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0
          bg-ink-800 border-r border-white/5 flex flex-col
          transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <img src="/alkapoint-logo.svg" alt="AlkaPoint" className="w-9 h-9" />
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-paper-100 tracking-tight">AlkaPoint</div>
            <div className="text-[10px] text-gold-500 font-semibold tracking-widest uppercase">
              {user?.Business?.name?.slice(0, 22) || 'Business Suite'}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {groups.map((g) => {
            const isOpen = open[g.key] ?? true;
            return (
              <div key={g.key}>
                <button
                  onClick={() => toggle(g.key)}
                  className="w-full flex items-center justify-between px-4 mt-2 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-paper-400 hover:text-paper-200"
                >
                  <span>{g.label}</span>
                  {g.module && <span className="text-[9px] text-gold-500/70 tracking-wider">{g.module}</span>}
                </button>
                {isOpen && g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-200 border border-brand-500/30'
                          : 'text-paper-200 hover:bg-white/5 hover:text-paper-100 border border-transparent'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-white/5 text-[10px] text-paper-400">
          v1.0 · Alkantra Suite
        </div>
      </aside>
    </>
  );
}