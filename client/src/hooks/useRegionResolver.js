import { useEffect, useMemo, useState } from 'react';
import { getCityRegions } from '../services/api';
import { buildRegionResolver } from '../data/locations';

// טוען פעם אחת את מיפוי היישובים→אזורים מהמאגר הממשלתי (דרך השרת), משתף את התוצאה
// בין כל הקומפוננטות (singleton), ונופל בשקט למיפוי הסטטי אם השרת אינו זמין.
let cachedMap = null;
let inflight = null;

export function useRegionResolver() {
  const [govMap, setGovMap] = useState(cachedMap);

  useEffect(() => {
    if (cachedMap) return undefined;
    if (!inflight) {
      inflight = getCityRegions()
        .then((map) => {
          cachedMap = map || {};
          return cachedMap;
        })
        .catch(() => {
          cachedMap = {};
          return cachedMap;
        });
    }
    let active = true;
    inflight.then((map) => {
      if (active) setGovMap(map);
    });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => buildRegionResolver(govMap), [govMap]);
}
