import { useState } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { productService } from '@/services/products';
import { orderService } from '@/services/orders';
import { useAuthStore } from '@/store/auth';
import { ProductCard } from '@/components/dashboard/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SupplierDashboard() {
  const { user } = useAuthStore();
  const { data: products, loading } = useSupabaseQuery(
    () => productService.getSupplierProducts(user?.id ?? ''),
    [user?.id]
  );
  const { data: orders } = useSupabaseQuery(
    () => orderService.getSupplierOrders(user?.id ?? ''),
    [user?.id]
  );

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    unit: '',
    category: '',
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await productService.createProduct({
        supplier_id: user.id,
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        unit: newProduct.unit,
        category: newProduct.category,
        stock_quantity: 0,
      });

      setIsAddingProduct(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        unit: '',
        category: '',
      });
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Products</h2>
        <Button onClick={() => setIsAddingProduct(true)}>Add New Product</Button>
      </div>

      {isAddingProduct && (
        <form onSubmit={handleAddProduct} className="mb-8 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={newProduct.name}
                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <Input
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <Input
                value={newProduct.unit}
                onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input
                value={newProduct.category}
                onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={newProduct.description}
                onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsAddingProduct(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Product</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={console.log}
          />
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Recent Orders</h2>
        <div className="space-y-4">
          {orders?.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">Order #{order.id.slice(0, 8)}</span>
                  <span className="ml-4 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" 
                  style={{
                    backgroundColor: 
                      order.status === 'pending' ? 'rgb(253 224 71)' :
                      order.status === 'confirmed' ? 'rgb(134 239 172)' :
                      order.status === 'processing' ? 'rgb(147 197 253)' :
                      order.status === 'shipped' ? 'rgb(167 139 250)' :
                      order.status === 'delivered' ? 'rgb(134 239 172)' :
                      'rgb(252 165 165)',
                  }}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}