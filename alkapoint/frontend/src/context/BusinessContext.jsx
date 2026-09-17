import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const businesses = user?.Business ? [user.Business] : [];
  const business = businesses.find((item) => item.id === selectedBusinessId) ?? businesses[0] ?? null;

  const switchBusiness = (item) => setSelectedBusinessId(item?.id ?? null);

  return (
    <BusinessContext.Provider value={{ business, businesses, switchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

// This hook is intentionally co-located with its provider so consumers share its private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be inside BusinessProvider');
  return ctx;
}
