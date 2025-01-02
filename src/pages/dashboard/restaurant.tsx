import { useState } from 'react';
import { supplierService } from '@/services/suppliers';
import { productService } from '@/services/products';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { SupplierCard } from '@/components/dashboard/supplier-card';
import { ProductCard } from '@/components/dashboard/product-card';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

export function RestaurantDashboard() {
  const [selectedSupplier, setSelectedSupplier] = useState<Profile | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);

  const { data: suppliers, loading: suppliersLoading, error: suppliersError } = 
    useSupabaseQuery(supplierService.getSuppliers);

  const { data: products, loading: productsLoading, error: productsError } = 
    useSupabaseQuery(
      () => selectedSupplier ? productService.getSupplierProducts(selectedSupplier.id) : null,
      [selectedSupplier?.id]
    );

  console.log('Restaurant Dashboard State:', {
    suppliers,
    suppliersLoading,
    suppliersError,
    selectedSupplier,
    products,
    productsLoading,
    productsError,
    cartLength: cart.length
  });

  const addToCart = (product: Product) => {
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      if (existing) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    const firstItem = cart[0];
    const supplierId = firstItem.product.supplier_id;
    
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    try {
      await orderService.createOrder(
        {
          supplier_id: supplierId,
          total_amount: totalAmount,
        },
        cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        }))
      );

      setCart([]);
      setSelectedSupplier(null);
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  if (suppliersLoading) {
    return <div className="container mx-auto px-4 py-8">Loading suppliers...</div>;
  }

  if (suppliersError) {
    return <div className="container mx-auto px-4 py-8 text-red-600">Error loading suppliers: {suppliersError.message}</div>;
  }

  if (!suppliers || suppliers.length === 0) {
    return <div className="container mx-auto px-4 py-8">No suppliers available.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!selectedSupplier ? (
        <>
          <h2 className="text-2xl font-bold mb-6">Available Suppliers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(supplier => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onViewProducts={() => setSelectedSupplier(supplier)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Products from {selectedSupplier.business_name}</h2>
            <Button variant="outline" onClick={() => setSelectedSupplier(null)}>
              Back to Suppliers
            </Button>
          </div>
          
          {productsLoading && <div>Loading products...</div>}
          
          {productsError && (
            <div className="text-red-600">Error loading products: {productsError.message}</div>
          )}

          {products && products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          ) : (
            <div>No products available from this supplier.</div>
          )}
        </>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <span className="font-semibold">{cart.length} items in cart</span>
              <span className="ml-4">
                Total: ${cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}
              </span>
            </div>
            <Button onClick={placeOrder}>Place Order</Button>
          </div>
        </div>
      )}
    </div>
  );
}