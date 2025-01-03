import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { useAuthStore } from '@/store/auth';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    image_url: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  shipping_address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  order_items: OrderItem[];
}

export function OrdersPage() {
  const { supabase } = useSupabase();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'supplier' | 'restaurant' | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserType();
      fetchOrders();

      // Subscribe to order updates
      const ordersSubscription = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: userType === 'supplier' 
              ? `supplier_id=eq.${user.id}`
              : `restaurant_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order update received:', payload);
            fetchOrders();
          }
        )
        .subscribe();

      // Subscribe to order items updates
      const orderItemsSubscription = supabase
        .channel('order_items')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_items'
          },
          (payload) => {
            console.log('Order item update received:', payload);
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        ordersSubscription.unsubscribe();
        orderItemsSubscription.unsubscribe();
      };
    }
  }, [user, userType]);

  const fetchUserType = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserType(data.type as 'supplier' | 'restaurant');
    } catch (error) {
      console.error('Error fetching user type:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              image_url
            )
          )
        `);

      // Filter orders based on user type
      if (userType === 'restaurant') {
        query = query.eq('restaurant_id', user?.id);
      } else if (userType === 'supplier') {
        query = query.eq('supplier_id', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOrderAction = async (orderId: string, action: 'accept' | 'reject' | 'complete') => {
    try {
      setIsUpdating(orderId);
      const newStatus = action === 'accept' ? 'processing' : action === 'reject' ? 'cancelled' : 'completed';
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600">Order ID: {order.id.slice(0, 8)}</p>
                <p className="text-gray-600">
                  Placed on: {format(new Date(order.created_at), 'MMM d, yyyy, h:mm a')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {userType === 'supplier' && order.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleOrderAction(order.id, 'accept')}
                      disabled={isUpdating === order.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleOrderAction(order.id, 'reject')}
                      disabled={isUpdating === order.id}
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </>
                )}
                {userType === 'supplier' && order.status === 'processing' && (
                  <Button
                    onClick={() => handleOrderAction(order.id, 'complete')}
                    disabled={isUpdating === order.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Mark as Completed
                  </Button>
                )}
                <Badge className={`
                  px-3 py-1
                  ${order.status === 'pending' ? 'bg-yellow-50 text-yellow-800' : ''}
                  ${order.status === 'processing' ? 'bg-blue-50 text-blue-800' : ''}
                  ${order.status === 'completed' ? 'bg-green-50 text-green-800' : ''}
                  ${order.status === 'cancelled' ? 'bg-red-50 text-red-800' : ''}
                `}>
                  {order.status}
                </Badge>
              </div>
            </div>

            {order.order_items.map((item) => (
              <div key={item.id} className="mb-6">
                <p className="text-lg font-medium">{item.products.name}</p>
                <p className="text-gray-600">
                  Quantity: {item.quantity} × ₹{item.unit_price}
                </p>
              </div>
            ))}

            <div className="flex justify-between items-center mb-6">
              <p className="text-lg font-medium">Total Amount:</p>
              <p className="text-lg font-medium">₹{order.total_amount}</p>
            </div>

            <div>
              <p className="text-gray-600 mb-2">Delivery Address:</p>
              <p className="text-gray-600">{order.shipping_address.address}</p>
              <p className="text-gray-600">
                {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
              </p>
            </div>
          </div>
        ))}

        {orders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
