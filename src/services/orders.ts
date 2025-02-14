import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItem = Database['public']['Tables']['order_items']['Insert'];

export const orderService = {
  async createOrder(order: OrderInsert, items: OrderItem[]) {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([order])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      ...item,
      order_id: orderData.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;
    return orderData;
  },

  async getRestaurantOrders(restaurantId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:profiles!supplier_id(business_name),
        items:order_items(
          *,
          product:products(name, unit)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getSupplierOrders(supplierId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:profiles!restaurant_id(business_name),
        items:order_items(
          *,
          product:products(name, unit)
        )
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: Order['status']) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToOrderUpdates(orderId: string, callback: (order: Order) => void) {
    return supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => callback(payload.new as Order)
      )
      .subscribe();
  }
}