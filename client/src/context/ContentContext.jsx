import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSiteContent, saveSiteContent, resetSiteContent } from '../services/api';

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getSiteContent();
      if (active) {
        setOverrides(data || {});
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const getOverride = useCallback((key) => overrides[key] || null, [overrides]);

  // שמירה: מעדכן מיידית את ה-state כדי שהשינוי יוצג חי, ואז שולח לשרת.
  const saveOverride = useCallback(async (key, { text, fontSize, color }) => {
    setOverrides((prev) => ({
      ...prev,
      [key]: { text, fontSize: fontSize || null, color: color || null },
    }));
    await saveSiteContent(key, { text, fontSize: fontSize || null, color: color || null });
  }, []);

  const resetOverride = useCallback(async (key) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    await resetSiteContent(key);
  }, []);

  const value = { overrides, loaded, getOverride, saveOverride, resetOverride };
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within a ContentProvider');
  return ctx;
}
