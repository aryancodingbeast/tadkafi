import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { SupplierNotification, getSupplierNotifications, updateNotificationStatus, markNotificationsAsSeen, subscribeToNotifications } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { formatPrice } from '@/lib/utils';
import { useNotificationStore } from '@/store/notifications';
import { updateOrderPaymentStatus } from '@/services/orderService';

export function SupplierNotificationsPage() {
  const { supabase } = useSupabase();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<SupplierNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setCount } = useNotificationStore();

  const loadNotifications = async () => {
    try {
      console.log('Loading notifications...');
      const data = await getSupplierNotifications(supabase);
      console.log('Loaded notifications:', data);
      setNotifications(data || []);
      
      // Update notification count (only count unseen notifications)
      const unseenCount = data?.filter(n => !n.seen).length || 0;
      setCount(unseenCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('Loading notifications for user:', user.id);
      loadNotifications();
      markNotificationsAsSeen(supabase).catch(console.error);
      
      // Subscribe to notification changes
      const cleanup = subscribeToNotifications(supabase, user.id, async (notification) => {
        console.log('Notification received:', notification);
        // Show toast for new notifications
        if (!notification.seen) {
          toast.info('New order received!');
        }
        await loadNotifications();
      });

      return cleanup;
    }
  }, [supabase, user]);

  const handleAcceptOrder = async (notificationId: string, orderId: string) => {
    try {
      // First accept the order
      await updateNotificationStatus(supabase, notificationId, 'accepted');
      
      // Show payment request to restaurant
      toast.success('Order accepted. Waiting for payment from restaurant.');

      // Subscribe to payment status changes
      const paymentSubscription = supabase
        .channel(`order-payment-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          async (payload: any) => {
            if (payload.new.payment_status === 'completed') {
              toast.success('Payment received! Order is now being processed.');
              paymentSubscription.unsubscribe();
            } else if (payload.new.payment_status === 'failed') {
              toast.error('Payment failed. Order will be cancelled.');
              paymentSubscription.unsubscribe();
            }
          }
        )
        .subscribe();

    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const handleReject = async (notificationId: string) => {
    try {
      console.log('Rejecting order:', notificationId);
      await updateNotificationStatus(supabase, notificationId, 'rejected');
      toast.success('Order rejected');
      await loadNotifications();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Failed to reject order');
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Please log in to view notifications</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Loading notifications...</h1>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Order Notifications</h1>
        <div className="text-center py-8">
          <p className="text-gray-500">No notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Order Notifications</h1>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-2">
                Order #{notification.order.id.slice(0, 8)}
              </h3>
              <div className="space-y-2">
                {notification.order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>{formatPrice(item.price_per_unit * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 font-semibold flex justify-between">
                  <span>Total</span>
                  <span>{formatPrice(notification.order.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Shipping Address</h4>
              <div className="text-sm">
                <p>{notification.order.shipping_address.street}</p>
                <p>
                  {notification.order.shipping_address.city},{' '}
                  {notification.order.shipping_address.state}
                </p>
                <p>PIN: {notification.order.shipping_address.zip}</p>
              </div>
            </div>

            {notification.status === 'pending' && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleReject(notification.id)}
                >
                  Reject
                </Button>
                <Button
                  className="w-full"
                  onClick={() => handleAcceptOrder(notification.id, notification.order.id)}
                >
                  Accept
                </Button>
              </div>
            )}

            {notification.status !== 'pending' && (
              <div className={`text-center p-2 rounded ${
                notification.status === 'accepted' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Order {notification.status}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
