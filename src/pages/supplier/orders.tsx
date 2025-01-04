import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

type Order = {
  id: string;
  created_at: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  delivery_address: string;
  notes?: string;
  items: OrderItem[];
  user: {
    email: string;
  };
};

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  product: {
    name: string;
  };
};

export default function SupplierOrders() {
  const { supabase } = useSupabase();
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data: supplierProfile } = await supabase
      .from('supplier_profiles')
      .select('id')
      .single();

    if (!supplierProfile) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(name)
        ),
        user:profiles(email)
      `)
      .eq('supplier_id', supplierProfile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    setOrders(data || []);
  }

  async function updateOrderStatus(orderId: string, status: Order['status']) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `Order ${status} successfully`,
    });

    fetchOrders();
  }

  function getStatusColor(status: Order['status']) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }

  function getStatusMessage(status: Order['status']) {
    switch (status) {
      case 'pending':
        return 'Waiting for processing';
      case 'processing':
        return 'Order is being processed';
      case 'completed':
        return 'Order completed';
      case 'cancelled':
        return 'Order cancelled';
      default:
        return status;
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Orders</h1>
      <div className="grid gap-6">
        {orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">
                  Order ID: {order.id}
                </p>
                <p className="text-sm text-gray-500">
                  Customer: {order.user.email}
                </p>
                <p className="text-sm text-gray-500">
                  Date: {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(order.status)}>
                  {order.status.toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  {getStatusMessage(order.status)}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity} × ${item.price_per_unit}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${item.total_price}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center">
              <p className="font-bold">
                Total: ${order.total_amount}
              </p>
              {order.status === 'pending' && (
                <div className="space-x-2">
                  <Button
                    variant="default"
                    onClick={() => updateOrderStatus(order.id, 'processing')}
                  >
                    Process Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {order.status === 'processing' && (
                <Button
                  variant="default"
                  onClick={() => updateOrderStatus(order.id, 'completed')}
                >
                  Mark as Completed
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
