import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/dashboard/product-card';
import { useSupabase } from '@/lib/supabase-context';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { Package2, TrendingUp, ShoppingCart, Plus, Search, X } from 'lucide-react';
import type { Product } from '@/lib/database.types';

// Add Dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function SupplierDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
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

      // Fetch total orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('supplier_id', user.id);

      // Calculate total revenue from completed orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('supplier_id', user.id)
        .eq('status', 'completed');

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue: totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your products and view orders</p>
            </div>
            <Button onClick={() => setIsAddingProduct(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Package2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Your Products</h2>
            <div className="relative flex-1 md:flex-none">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 w-full md:w-72"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-gray-600">
                {searchQuery
                  ? "We couldn't find any products matching your criteria."
                  : "Start by adding your first product."}
              </p>
            </div>
          )}
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