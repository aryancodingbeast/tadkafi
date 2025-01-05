import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase';
import { Package2, Search } from 'lucide-react';
import type { Product } from '@/lib/database.types';

export function RestaurantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { supabase } = useSupabase();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, profiles(business_name)');

      if (error) throw error;

      // Transform the data to include full image URLs
      const productsWithUrls = data?.map(product => ({
        ...product,
        image_url: product.image_url ? supabase.storage.from('products').getPublicUrl(`${product.supplier_id}/${product.image_url}`).data.publicUrl : null
      })) || [];

      setProducts(productsWithUrls);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-gray-500">Browse products from all suppliers</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            placeholder="Search products by name, description, or category..."
            type="search"
            className="pl-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.description}</p>
                <p className="mt-1 text-xs text-gray-400">{product.category}</p>
                <p className="mt-1 text-xs text-blue-500">
                  {(product.profiles as any)?.business_name}
                </p>
                <p className="mt-2 font-medium">₹{product.price.toFixed(2)}</p>
              </div>
              <Package2 className="h-5 w-5 text-gray-400" />
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
