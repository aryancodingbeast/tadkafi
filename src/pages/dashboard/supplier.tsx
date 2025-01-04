import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product-card';
import { useSupabase } from '@/lib/supabase-context';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { Package2, TrendingUp, ShoppingCart, Plus, Search, X } from 'lucide-react';
import type { Product } from '@/lib/database.types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// Add Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  restaurant_id: string;
  restaurant: {
    business_name: string;
  };
  order_items: OrderItem[];
}

function StatsCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="bg-primary/10 p-3 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

export function SupplierDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: '',
    category: '',
    stock_quantity: '',
    image: null as File | null
  });
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: '',
    category: '',
    stock_quantity: '',
    image: null as File | null
  });
  const { supabase } = useSupabase();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchStats();
      fetchRecentOrders();

      // Subscribe to order updates
      const ordersSubscription = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `supplier_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Order update received:', payload);
            fetchRecentOrders();
            fetchStats();
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
            fetchRecentOrders();
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        ordersSubscription.unsubscribe();
        orderItemsSubscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchStats();
      fetchRecentOrders();
    }
  }, [user]);

  useEffect(() => {
    if (editingProduct) {
      setEditForm({
        name: editingProduct.name,
        description: editingProduct.description || '',
        price: editingProduct.price.toString(),
        unit: editingProduct.unit,
        category: editingProduct.category,
        stock_quantity: editingProduct.stock_quantity.toString(),
        image: null
      });
    }
  }, [editingProduct]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      console.log('Fetching products for supplier:', user.id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      console.log('Fetched products:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('supplier_id', user.id);

      // Fetch stats from the new view
      const { data: statsData, error: statsError } = await supabase
        .from('supplier_order_stats')
        .select('*')
        .eq('supplier_id', user.id)
        .single();

      if (statsError) throw statsError;

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: statsData?.total_orders || 0,
        totalRevenue: statsData?.total_revenue || 0,
        processingOrders: statsData?.processing_orders || 0,
        completedOrders: statsData?.completed_orders || 0,
        cancelledOrders: statsData?.cancelled_orders || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentOrders = async () => {
    if (!user) return;

    try {
      console.log('Fetching orders for supplier:', user.id);
      
      // Fetch all orders with details
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant:profiles!orders_restaurant_id_fkey (
            business_name
          ),
          order_items (
            id,
            quantity,
            unit_price,
            products (
              name,
              image_url
            )
          )
        `)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Fetched orders:', data);
      setRecentOrders(data || []);
    } catch (error) {
      console.error('Error in fetchRecentOrders:', error);
      setRecentOrders([]);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    try {
      let imageUrl = editingProduct.image_url;

      // If new image was selected, upload it
      if (editForm.image) {
        imageUrl = await handleImageUpload(editForm.image);
      }

      const updates = {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        unit: editForm.unit,
        category: editForm.category,
        stock_quantity: parseInt(editForm.stock_quantity),
        image_url: imageUrl
      };

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', editingProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(products.map(p => 
        p.id === editingProduct.id ? { ...p, ...updates } : p
      ));

      // Close modal and reset form
      setEditingProduct(null);
      setEditForm({
        name: '',
        description: '',
        price: '',
        unit: '',
        category: '',
        stock_quantity: '',
        image: null
      });
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
        .eq('supplier_id', user?.id); // Extra safety check

      if (error) throw error;

      // Delete image from storage if it exists
      if (product.image_url) {
        const imagePath = product.image_url.split('/').pop(); // Get filename from URL
        if (imagePath) {
          const { error: storageError } = await supabase.storage
            .from('products')
            .remove([`${user?.id}/${imagePath}`]);
          
          if (storageError) {
            console.error('Error deleting image:', storageError);
          }
        }
      }

      // Update local state
      setProducts(products.filter(p => p.id !== product.id));
      
      // Refresh stats since we deleted a product
      fetchStats();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleAddProduct = async () => {
    try {
      let imageUrl = '';

      // Upload image if selected
      if (newProductForm.image) {
        imageUrl = await handleImageUpload(newProductForm.image);
      }

      const newProduct = {
        name: newProductForm.name,
        description: newProductForm.description,
        price: parseFloat(newProductForm.price),
        unit: newProductForm.unit,
        category: newProductForm.category,
        stock_quantity: parseInt(newProductForm.stock_quantity),
        image_url: imageUrl,
        supplier_id: user?.id
      };

      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (error) throw error;

      // Add new product to local state
      setProducts([data, ...products]);

      // Reset form and close modal
      setNewProductForm({
        name: '',
        description: '',
        price: '',
        unit: '',
        category: '',
        stock_quantity: '',
        image: null
      });
      setIsAddingProduct(false);

      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!user) return;

    try {
      console.log('Updating order status:', orderId, newStatus);
      
      const { data, error } = await supabase.rpc('supplier_update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_supplier_id: user.id
      });

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      // Update local state
      setRecentOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      // Refresh stats since we updated an order
      fetchStats();
      
      console.log('Order status updated successfully');
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
      alert('Failed to update order status. Please try again.');
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Supplier Dashboard</h1>
        <div className="flex gap-4">
          <Link to="/supplier/notifications">
            <Button variant="outline">
              View Notifications
            </Button>
          </Link>
          <Button onClick={() => setIsAddingProduct(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold">{stats.totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold">{stats.totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold">₹{Number(stats.totalRevenue).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="mt-8">
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium">Order #{order.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Restaurant: {order.restaurant?.business_name}
                  </p>
                </div>
                <Badge
                  className={
                    order.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.products?.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="font-medium">
                      ₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Total and Delivery Address */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-medium">Total Amount</p>
                  <p className="font-medium text-lg">
                    ₹{Number(order.total_amount).toLocaleString('en-IN')}
                  </p>
                </div>
                {order.shipping_address && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Delivery Address:</p>
                    <p>{order.shipping_address.address}</p>
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {order.status === 'processing' && (
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => handleStatusUpdate(order.id, 'completed')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark as Completed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Cancel Order
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Products</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDelete(product)}
            />
          ))}
        </div>
      </div>

      {/* Edit Product Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Product description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  placeholder="Price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder="Unit (e.g., kg, piece)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="Category"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  value={editForm.stock_quantity}
                  onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })}
                  placeholder="Stock quantity"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Image</label>
              <div className="flex items-center gap-4">
                {editingProduct?.image_url && (
                  <img 
                    src={editingProduct.image_url} 
                    alt={editForm.name} 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditForm({ ...editForm, image: file });
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Upload a new image or keep the existing one
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newProductForm.name}
                onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newProductForm.description}
                onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                placeholder="Product description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  value={newProductForm.price}
                  onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                  placeholder="Price"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={newProductForm.unit}
                  onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                  placeholder="Unit (e.g., kg, piece)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                  placeholder="Category"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  value={newProductForm.stock_quantity}
                  onChange={(e) => setNewProductForm({ ...newProductForm, stock_quantity: e.target.value })}
                  placeholder="Stock quantity"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewProductForm({ ...newProductForm, image: file });
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}