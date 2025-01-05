import { SupabaseClient } from '@supabase/supabase-js';
import { CartItem } from '@/lib/cart-context';

export type OrderStatus = 'pending' | 'processing' | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreateOrderParams {
  supplier_id: string;
  total_amount: number;
  shipping_address: ShippingAddress;
  items: {
    product_id: string;
    quantity: number;
    price_per_unit: number;
    total_price: number;
  }[];
  payment_method: 'online';
}

export async function createOrder(
  supabase: SupabaseClient,
  params: CreateOrderParams
) {
  try {
    console.log('Creating order with params:', params);
    
    // Get the current user's ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Failed to get user:', userError);
      throw new Error(`Failed to get user: ${userError.message}`);
    }
    if (!user) {
      throw new Error('No authenticated user found');
    }

    console.log('Current user:', user.id);

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        supplier_id: params.supplier_id,
        total_amount: params.total_amount,
        shipping_address: params.shipping_address,
        status: 'pending',
        payment_method: params.payment_method,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Created order:', order);

    // Create order items
    const orderItems = params.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      total_price: item.total_price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log('Created order items');
    return { orderId: order.id };
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
}

export async function getOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(*)
      ),
      supplier:suppliers(*)
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data;
}

export async function getUserOrders(supabase: SupabaseClient) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No authenticated user found');

    console.log('Fetching orders for user:', user.id);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          product_id,
          quantity,
          price_per_unit,
          total_price,
          product:products (
            name
          )
        ),
        supplier:suppliers (
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    console.log('Fetched orders:', data);
    return data;
  } catch (error) {
    console.error('Error in getUserOrders:', error);
    throw error;
  }
}

export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: OrderStatus
) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

// Update order payment status
export async function updateOrderPaymentStatus(
  supabase: SupabaseClient,
  orderId: string,
  status: PaymentStatus
): Promise<void> {
  console.log(`[updateOrderPaymentStatus] Starting update for order ${orderId} to ${status}`);
  
  // First check if order exists
  const { data: existingOrder, error: checkError } = await supabase
    .from('orders')
    .select('id, status, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (checkError) {
    console.error('[updateOrderPaymentStatus] Error checking order:', checkError);
    throw checkError;
  }

  if (!existingOrder) {
    console.error('[updateOrderPaymentStatus] Order not found:', orderId);
    throw new Error(`Order ${orderId} not found`);
  }

  console.log('[updateOrderPaymentStatus] Found existing order:', existingOrder);

  // Perform the update
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      payment_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (updateError) {
    console.error('[updateOrderPaymentStatus] Update error:', updateError);
    throw updateError;
  }

  // Refresh the stats
  const { error: refreshError } = await supabase.rpc('manual_refresh_supplier_stats');
  if (refreshError) {
    console.error('[updateOrderPaymentStatus] Error refreshing stats:', refreshError);
    // Don't throw here, just log the error since the payment status was updated successfully
  }

  // Fetch the updated order
  const { data: updatedOrder, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError || !updatedOrder) {
    console.error('[updateOrderPaymentStatus] Error fetching updated order:', fetchError);
    throw fetchError || new Error('Failed to fetch updated order');
  }

  console.log('[updateOrderPaymentStatus] Successfully updated order:', updatedOrder);
}
