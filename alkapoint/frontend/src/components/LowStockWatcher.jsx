import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function LowStockWatcher() {
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || ranRef.current) return;
    ranRef.current = true;
    api.get('/inventory/stock').then((res) => {
      const low = res.data.filter((s) => s.isLow).length;
      if (low > 0) {
        toast(`${low} item${low > 1 ? 's' : ''} are low on stock. Open Inventory to restock.`, { icon: '⚠️', duration: 8000 });
      }
    });
  }, [user]);

  return null;
}