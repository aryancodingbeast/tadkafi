import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { getUserOrders, updateOrderPaymentStatus } from '@/services/orderService';
import type { OrderStatus } from '@/services/orderService';
import { toast } from 'sonner';
import { PaymentModal } from '@/components/PaymentModal';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_address: string;
  notes?: string;
  items: OrderItem[];
  supplier: {
    name: string;
  };
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'online' | 'cod';
}

export function OrdersPage() {
  const { supabase } = useSupabase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();

    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      console.log('Setting up real-time subscription for user:', userId);
      
      // Subscribe to real-time updates for orders
      const channel = supabase
        .channel('orders-channel')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('Received real-time update:', payload);
            
            const updatedOrder = payload.new as Order;
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === updatedOrder.id 
                  ? { ...order, ...updatedOrder }
                  : order
              )
            );
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates');
          }
        });

      return () => {
        console.log('Cleaning up subscription');
        supabase.removeChannel(channel);
      };
    };

    getCurrentUser();
  }, [supabase]);

  async function fetchOrders() {
    try {
      const data = await getUserOrders(supabase);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  function getStatusBadge(status: OrderStatus, paymentStatus: string) {
    let color = '';
    let text = '';

    switch (status) {
      case 'pending':
        color = 'bg-yellow-500';
        text = 'Pending Confirmation';
        break;
      case 'processing':
        if (paymentStatus === 'pending') {
          color = 'bg-blue-500';
          text = 'Payment Required';
        } else if (paymentStatus === 'completed') {
          color = 'bg-blue-500';
          text = 'Processing';
        } else if (paymentStatus === 'refunded') {
          color = 'bg-red-500';
          text = 'Refunded';
        } else {
          color = 'bg-red-500';
          text = 'Payment Failed';
        }
        break;
      case 'completed':
        color = 'bg-green-500';
        text = 'Completed';
        break;
      case 'cancelled':
        color = 'bg-red-500';
        text = 'Cancelled';
        break;
      default:
        color = 'bg-gray-500';
        text = status;
    }

    return <Badge className={color}>{text}</Badge>;
  }

  async function handlePayment(order: Order) {
    setSelectedOrder(order);
  }

  async function handlePaymentSuccess() {
    if (!selectedOrder) return;

    try {
      console.log('Starting payment update for order:', selectedOrder.id);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current user:', session?.user?.id);

      await updateOrderPaymentStatus(supabase, selectedOrder.id, 'completed');
      console.log('Payment status updated successfully');
      
      toast.success('Payment successful! Order is being processed.');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status.');
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="grid gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold">
                  Order #{order.id.slice(0, 8)}
                </h3>
                {getStatusBadge(order.status, order.payment_status)}
              </div>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity} × ₹{item.price_per_unit}
                    </p>
                  </div>
                  <p className="font-medium">
                    ₹{item.total_price}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center">
              <p className="font-bold">
                Total: ₹{order.total_amount}
              </p>
              {order.status === 'processing' && order.payment_status === 'pending' && (
                <Button
                  onClick={() => handlePayment(order)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Pay Now
                </Button>
              )}
              {order.payment_status === 'completed' && (
                <Badge className="bg-green-500">
                  Paid
                </Badge>
              )}
              {order.payment_status === 'refunded' && (
                <Badge className="bg-yellow-500">
                  Refunded
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      <PaymentModal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSuccess={handlePaymentSuccess}
        amount={selectedOrder?.total_amount || 0}
      />
    </div>
  );
}
