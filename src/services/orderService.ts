import { supabase } from '@/lib/supabase';

export type OrderStatus = 'processing' | 'completed' | 'cancelled';

export interface OrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderParams {
  supplier_id: string;
  total_amount: number;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  items: OrderItem[];
}

export const createOrder = async (params: CreateOrderParams) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Call the create_order RPC function
    const { data, error } = await supabase.rpc('create_order', {
      p_restaurant_id: userData.user.id,
      p_supplier_id: params.supplier_id,
      p_total_amount: params.total_amount,
      p_shipping_address: params.shipping_address,
      p_items: params.items
    });

    if (error) throw error;
    return { orderId: data };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
) => {
  try {
    let retries = 3;
    while (retries > 0) {
      // Get current version
      const { data: order } = await supabase
        .from('orders')
        .select('version')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Order not found');

      // Try to update
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_version: order.version
      });

      if (error) {
        if (error.message.includes('Invalid status transition')) {
          throw error;
        }
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 100)); // Wait before retry
          continue;
        }
        throw error;
      }

      return data;
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};
