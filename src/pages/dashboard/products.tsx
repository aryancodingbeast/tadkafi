import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package2, Search, ShoppingCart, Plus, Minus } from 'lucide-react';
import type { Product } from '@/lib/database.types';
import { Label } from "@/components/ui/label";
import { useCart } from '@/lib/cart-context';
import { toast } from 'react-hot-toast';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const { supabase } = useSupabase();
  const { addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, profiles(business_name)')
        .gt('stock_quantity', 0);

      if (error) throw error;
      
      // Initialize quantities and transform image URLs
      const initialQuantities = data?.reduce((acc, product) => {
        acc[product.id] = 1;
        return acc;
      }, {} as { [key: string]: number }) || {};
      
      // Transform the data to include full image URLs
      const productsWithUrls = data?.map(product => ({
        ...product,
        image_url: product.image_url ? supabase.storage.from('products').getPublicUrl(`${product.supplier_id}/${product.image_url}`).data.publicUrl : null
      })) || [];
      
      setQuantities(initialQuantities);
      setProducts(productsWithUrls);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const product = products.find(p => p.id === productId);
      const newQty = Math.max(1, Math.min(currentQty + delta, product?.stock_quantity || 1));
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = async (product: Product) => {
    const quantity = quantities[product.id] || 1;
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    
    try {
      await addToCart(product.id, quantity);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-gray-500">Browse all available products</p>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search products by name, description, or category..."
            type="search"
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative aspect-square">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-100">
                  <Package2 className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="text-gray-600 text-sm mt-1">{product.description}</p>
              <p className="text-sm text-gray-500 mt-1">{product.category}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-medium">₹{product.price.toFixed(2)}</p>
                  <p className="text-gray-500 text-sm">per {product.unit}</p>
                </div>
                <p className="text-gray-500 text-sm">
                  by {(product.profiles as any)?.business_name}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center border rounded-md">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(product.id, -1)}
                    disabled={addingToCart[product.id]}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{quantities[product.id] || 1}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(product.id, 1)}
                    disabled={addingToCart[product.id]}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  className="flex-1"
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCart[product.id]}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addingToCart[product.id] ? 'Adding...' : 'Add to Cart'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  );
}
