import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-context';
import { SupplierCard } from '@/components/dashboard/supplier-card';
import { Input } from '@/components/ui/input';
import { Package2, Search, X } from 'lucide-react';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function RestaurantDashboard() {
  const [suppliers, setSuppliers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalProducts: 0,
    totalOrders: 0
  });
  const { supabase } = useSupabase();

  useEffect(() => {
    fetchSuppliers();
    fetchStats();
  }, []);

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('type', 'supplier');

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }

      console.log('Fetched suppliers:', data);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error in fetchSuppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count total suppliers
      const { data: suppliers, count: suppliersCount, error: suppliersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('type', 'supplier');

      if (suppliersError) throw suppliersError;

      // Count total available products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, supplier_id, stock_quantity')
        .gt('stock_quantity', 0);

      if (productsError) throw productsError;

      console.log('Products with stock:', products?.map(p => ({
        id: p.id,
        name: p.name,
        supplier_id: p.supplier_id,
        stock: p.stock_quantity
      })));

      // Count total orders for this restaurant
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact' });

      if (ordersError) throw ordersError;

      setStats({
        totalSuppliers: suppliersCount || 0,
        totalProducts: products?.length || 0,
        totalOrders: ordersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalSuppliers: 0,
        totalProducts: 0,
        totalOrders: 0
      });
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Restaurant Dashboard</h1>
              <p className="text-gray-600 mt-1">Browse suppliers and manage your orders</p>
            </div>
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
                <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <Package2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <Package2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Your Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Suppliers Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Available Suppliers</h2>
            <div className="relative flex-1 md:flex-none">
              <Input
                type="text"
                placeholder="Search suppliers..."
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
          ) : filteredSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No suppliers found</h3>
              <p className="mt-2 text-gray-600">
                {searchQuery
                  ? "We couldn't find any suppliers matching your criteria."
                  : "No suppliers are currently available."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}