import { createContext, useContext, useState, useCallback } from 'react';
import { useSupabase } from './supabase-context';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
  supplier_id: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQuantity: (productId: string, quantity: number) => void;
  isLoading: boolean;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();
  const { user } = useAuthStore();

  const addToCart = useCallback(async (productId: string, quantity: number) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    setIsLoading(true);
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (!product) {
        toast.error('Product not found');
        return;
      }

      if (product.stock_quantity < quantity) {
        toast.error('Not enough stock available');
        return;
      }

      // Check if item from same supplier exists
      const existingItem = items.find((item) => item.supplier_id === product.supplier_id);
      if (existingItem && existingItem.id !== productId) {
        const confirm = window.confirm(
          'You can only order from one supplier at a time. Would you like to clear your cart and add this item?'
        );
        if (confirm) {
          setItems([]);
        } else {
          return;
        }
      }

      // Check if item already exists
      const itemExists = items.find((item) => item.id === productId);
      if (itemExists) {
        setItems(
          items.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        );
      } else {
        setItems([
          ...items,
          {
            id: product.id,
            quantity,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            supplier_id: product.supplier_id,
          },
        ]);
      }

      toast.success('Added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setIsLoading(false);
    }
  }, [items, supabase, user]);

  const removeFromCart = useCallback((productId: string) => {
    setItems(items.filter((item) => item.id !== productId));
  }, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [items]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        isLoading,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
