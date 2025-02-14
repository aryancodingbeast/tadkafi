import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface UnpaidOrdersStore {
  count: number;
  setCount: (count: number) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  initializeRealtimeSubscription: () => void;
}

export const useUnpaidOrdersStore = create<UnpaidOrdersStore>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
  reset: () => set({ count: 0 }),
  initializeRealtimeSubscription: () => {
    // Initial fetch of unpaid orders count
    const fetchUnpaidOrdersCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unpaid');
      
      if (count !== null) {
        set({ count });
      }
    };

    fetchUnpaidOrdersCount();

    // Set up realtime subscription
    const subscription = supabase
      .channel('unpaid-orders-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: 'status=eq.unpaid'
        },
        (payload) => {
          // Refetch count on any changes to unpaid orders
          fetchUnpaidOrdersCount();
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  },
}));
