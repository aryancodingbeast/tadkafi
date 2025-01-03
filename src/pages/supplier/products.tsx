import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/lib/supabase-context';
import { ProductCard } from '@/components/product-card';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Search, X } from 'lucide-react';
import type { Product } from '@/lib/database.types';

export function SupplierProductsPage() {
  const { supplierId } = useParams();
  const { supabase } = useSupabase();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [supplierName, setSupplierName] = useState('');

  useEffect(() => {
    fetchSupplierDetails();
    fetchProducts();
  }, [supplierId]);

  const fetchSupplierDetails = async () => {
    if (!supplierId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', supplierId)
        .single();

      if (error) throw error;
      if (data) {
        setSupplierName(data.business_name);
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error);
    }
  };

  const fetchProducts = async () => {
    if (!supplierId) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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
              <h1 className="text-2xl font-bold text-gray-900">{supplierName}</h1>
              <p className="text-gray-600 mt-1">Browse available products</p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>
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
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-gray-600">
                {searchQuery
                  ? "We couldn't find any products matching your criteria."
                  : "This supplier hasn't added any products yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
