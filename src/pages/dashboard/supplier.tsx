import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product-card';
import { useSupabase } from '@/lib/supabase-context';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { Package2, TrendingUp, ShoppingCart, Plus, Search, X, ChevronsUpDown, Check, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/database.types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { FOOD_CATEGORIES } from '@/lib/constants';
import { cn } from "@/lib/utils";
import { toast } from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  product: {
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
  const { supabase } = useSupabase();
  const [products, setProducts] = useState<Product[]>([]);
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    // Initial fetch
    fetchProducts();
    fetchStats();

    // Set up realtime subscriptions
    const productsSubscription = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' }, 
        (payload) => {
          console.log('Products change received:', payload);
          fetchProducts(); // Refresh products on any change
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('orders-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Orders change received:', payload);
          fetchStats(); // Refresh stats on any order change
      })
      .subscribe();

    return () => {
      productsSubscription.unsubscribe();
      ordersSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchStats();
    }
  }, [user]);

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
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_id', user.id);

      if (productsError) throw productsError;

      // Fetch stats from the view
      const { data: statsData, error: statsError } = await supabase
        .from('supplier_order_stats')
        .select('*')
        .eq('supplier_id', user.id)
        .maybeSingle();

      if (statsError && statsError.message !== 'JSON object requested, multiple (or no) rows returned') {
        throw statsError;
      }

      setStats({
        totalProducts: productsData?.length || 0,
        totalOrders: statsData?.total_orders || 0,
        totalRevenue: statsData?.total_revenue || 0,
        processingOrders: statsData?.processing_orders || 0,
        completedOrders: statsData?.completed_orders || 0,
        cancelledOrders: statsData?.cancelled_orders || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
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

  const handleDeleteProduct = async () => {
    if (!productToDelete || !user) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('supplier_id', user.id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productToDelete.id));
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (!newProductForm.category) {
        toast.error('Please select a category');
        return;
      }

      if (!newProductForm.unit) {
        toast.error('Please enter a unit');
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            name: newProductForm.name,
            description: newProductForm.description,
            price: parseFloat(newProductForm.price),
            unit: newProductForm.unit,
            category: newProductForm.category,
            stock_quantity: parseInt(newProductForm.stock_quantity),
            supplier_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setProducts([data, ...products]);
      setIsAddingProduct(false);
      setNewProductForm({
        name: '',
        description: '',
        price: '',
        unit: '',
        category: '',
        stock_quantity: '',
        image: null
      });
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
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
          <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Fill in the product details below. All fields are required.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProduct}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      placeholder="Enter product name (e.g., Fresh Tomatoes)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={newProductForm.description}
                      onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                      placeholder="Brief description of your product"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price</label>
                      <Input
                        type="number"
                        value={newProductForm.price}
                        onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                        placeholder="Enter price in ₹"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit</label>
                      <Input
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                        placeholder="e.g., kg, piece, dozen"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        value={newProductForm.category}
                        onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      >
                        <option value="">Select food category...</option>
                        {FOOD_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stock Quantity</label>
                      <Input
                        type="number"
                        value={newProductForm.stock_quantity}
                        onChange={(e) => setNewProductForm({ ...newProductForm, stock_quantity: e.target.value })}
                        placeholder="Available quantity"
                        required
                        min="0"
                        step="1"
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
                    <p className="text-xs text-gray-500">Upload a clear image of your product</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Product
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold">{stats.totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold">{stats.totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold">₹{Number(stats.totalRevenue).toLocaleString('en-IN')}</p>
            </div>
          </div>
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
            <div key={product.id} className="overflow-hidden">
              <div className="relative aspect-square">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <Package2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProductToDelete(product);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Price:</span>
                    <span className="font-medium">₹{product.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Unit:</span>
                    <span className="font-medium">{product.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Category:</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Stock:</span>
                    <span className="font-medium">{product.stock_quantity} {product.unit}s</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update your product details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter product name (e.g., Fresh Tomatoes)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Brief description of your product"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  placeholder="Enter price in ₹"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder="e.g., kg, piece, dozen"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select food category...</option>
                  {FOOD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  value={editForm.stock_quantity}
                  onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })}
                  placeholder="Available quantity"
                  required
                  min="0"
                  step="1"
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
                  <p className="text-xs text-gray-500">
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
    </div>
  );
}