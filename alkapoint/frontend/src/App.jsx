import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider } from './context/BusinessContext';
import AnimatedBackground from './components/AnimatedBackground';
import InstallButton from './components/InstallButton';
import LowStockWatcher from './components/LowStockWatcher';
import Layout from './components/layout/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Debtors from './pages/Debtors';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Partners from './pages/Partners';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Sales from './pages/Sales';
import Profile from './pages/Profile';
import Roles from './pages/Roles';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-paper-300 text-sm">
        Loading AlkaPoint…
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="sales" element={<Sales />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="customers" element={<Customers />} />
        <Route path="debtors" element={<Debtors />} />
        <Route path="payments" element={<Payments />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="partners" element={<Partners />} />
        <Route path="reports" element={<Reports />} />
        <Route path="roles" element={<Roles />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AnimatedBackground />
          <div className="relative z-10">
            <AppRoutes />
            <LowStockWatcher />
          </div>
          <InstallButton />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1c2128',
                color: '#e6edf3',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              },
              success: { iconTheme: { primary: '#2ea043', secondary: '#fff' } },
              error: { duration: 5000, iconTheme: { primary: '#da3633', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </BusinessProvider>
    </AuthProvider>
  );
}