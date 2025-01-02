import { Button } from '@/components/ui/button';
import { Building2, Package2 } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-context';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SupplierCardProps {
  supplier: Profile;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [productCount, setProductCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductCount();
  }, [supplier.id]);

  const fetchProductCount = async () => {
    try {
      console.log('Fetching products for supplier:', supplier.id, supplier.business_name);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('supplier_id', supplier.id);

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      console.log('All products for supplier:', data);

      const productsWithStock = data?.filter(p => p.stock_quantity > 0) || [];
      console.log('Products with stock:', productsWithStock);

      setProductCount(productsWithStock.length);
    } catch (error) {
      console.error('Error in fetchProductCount:', error);
      setProductCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="absolute -bottom-12 left-6">
          <div className="bg-white p-3 rounded-xl shadow-md">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-16">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{supplier.business_name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{supplier.address}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Available Products</span>
            </div>
            {loading ? (
              <div className="animate-pulse h-6 w-6 bg-gray-200 rounded"></div>
            ) : (
              <span className="text-lg font-bold text-gray-900">{productCount}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(`/supplier/${supplier.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 w-full justify-center"
          >
            View Products
          </Button>
        </div>
      </div>
    </div>
  );
}
