import { create } from 'zustand';

interface NotificationStore {
  count: number;
  setCount: (count: number) => void;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
  reset: () => set({ count: 0 }),
}));
