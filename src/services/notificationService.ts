import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export interface SupplierNotification {
  id: string;
  supplier_id: string;
  order_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  seen: boolean;
  created_at: string;
  updated_at: string;
  order: {
    id: string;
    total_amount: number;
    shipping_address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    items: {
      id: string;
      quantity: number;
      price_per_unit: number;
      product: {
        id: string;
        name: string;
      };
    }[];
  };
}

let notificationChannel: ReturnType<SupabaseClient['channel']> | null = null;
let activeSubscriptions: ((notification: SupplierNotification) => void)[] = [];

export function subscribeToNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  onNotification: (notification: SupplierNotification) => void
) {
  // Add the subscription callback
  activeSubscriptions.push(onNotification);

  // If we already have a channel, just return the cleanup function
  if (notificationChannel) {
    return () => {
      activeSubscriptions = activeSubscriptions.filter(cb => cb !== onNotification);
    };
  }

  // Create a new channel if one doesn't exist
  notificationChannel = supabase
    .channel('any-notifications')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'supplier_notifications',
        filter: `supplier_id=eq.${userId}`,
      },
      async (payload) => {
        console.log('Notification change:', payload);

        // Fetch the complete notification with order details
        const { data: notification, error } = await supabase
          .from('supplier_notifications')
          .select(`
            *,
            order:orders(
              id,
              total_amount,
              shipping_address,
              items:order_items(
                id,
                quantity,
                price_per_unit,
                product:products(
                  id,
                  name
                )
              )
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (error) {
          console.error('Error fetching notification details:', error);
          return;
        }

        // Notify all subscribers
        activeSubscriptions.forEach(callback => 
          callback(notification as unknown as SupplierNotification)
        );
      }
    )
    .subscribe((status) => {
      console.log('Notification subscription status:', status);
    });

  return () => {
    activeSubscriptions = activeSubscriptions.filter(cb => cb !== onNotification);
    if (activeSubscriptions.length === 0 && notificationChannel) {
      supabase.removeChannel(notificationChannel);
      notificationChannel = null;
    }
  };
}

export async function getSupplierNotifications(
  supabase: SupabaseClient<Database>
): Promise<SupplierNotification[]> {
  console.log('Fetching supplier notifications...');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Failed to get user:', userError);
    throw new Error(`Failed to get user: ${userError.message}`);
  }
  if (!user) {
    throw new Error('No authenticated user found');
  }

  console.log('Current user:', user.id);

  const { data, error } = await supabase
    .from('supplier_notifications')
    .select(`
      *,
      order:orders(
        id,
        total_amount,
        shipping_address,
        items:order_items(
          id,
          quantity,
          price_per_unit,
          product:products(
            id,
            name
          )
        )
      )
    `)
    .eq('supplier_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch notifications:', error);
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  console.log('Fetched notifications:', data);
  return data as unknown as SupplierNotification[];
}

export async function updateNotificationStatus(
  supabase: SupabaseClient<Database>,
  notificationId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  console.log('Updating notification status:', { notificationId, status });

  const { data, error } = await supabase
    .from('supplier_notifications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update notification:', error);
    throw new Error(`Failed to update notification: ${error.message}`);
  }

  console.log('Updated notification:', data);
  return;
}

export async function markNotificationsAsSeen(
  supabase: SupabaseClient<Database>
): Promise<void> {
  console.log('Marking notifications as seen');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Failed to get user:', userError);
    throw new Error('No authenticated user found');
  }

  const { error } = await supabase
    .from('supplier_notifications')
    .update({ seen: true })
    .eq('supplier_id', user.id)
    .eq('seen', false);

  if (error) {
    console.error('Error marking notifications as seen:', error);
    throw error;
  }
}

export async function getUnseenNotificationCount(
  supabase: SupabaseClient<Database>
): Promise<number> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Failed to get user:', userError);
    throw new Error('No authenticated user found');
  }

  const { count, error } = await supabase
    .from('supplier_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', user.id)
    .eq('seen', false);

  if (error) {
    console.error('Error getting unseen notification count:', error);
    throw error;
  }

  return count || 0;
}
