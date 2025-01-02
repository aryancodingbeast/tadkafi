import { useEffect, useState } from 'react';
import { PostgrestError } from '@supabase/supabase-js';

export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('useSupabaseQuery: Starting fetch');
        const result = await queryFn();
        console.log('useSupabaseQuery: Got result', result);
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        console.error('useSupabaseQuery: Error fetching data', e);
        if (isMounted) {
          setError(e as PostgrestError);
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, deps);

  return { data, error, loading };
}