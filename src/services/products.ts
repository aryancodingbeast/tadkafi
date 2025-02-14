import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export const productService = {
  async getProducts(category?: string) {
    console.log('Getting products, category:', category);
    const query = supabase
      .from('products')
      .select('*, profiles(business_name)');
    
    if (category) {
      query.eq('category', category);
    }

    const { data, error } = await query;
    console.log('Products query result:', { data, error });
    if (error) throw error;
    return data;
  },

  async getSupplierProducts(supplierId: string) {
    console.log('Getting supplier products, supplierId:', supplierId);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('supplier_id', supplierId);
    
    console.log('Supplier products query result:', { data, error });
    if (error) throw error;
    return data;
  },

  async createProduct(product: ProductInsert) {
    console.log('Creating product:', product);
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    console.log('Create product query result:', { data, error });
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: ProductUpdate) {
    console.log('Updating product, id:', id, 'updates:', updates);
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    console.log('Update product query result:', { data, error });
    if (error) throw error;
    return data;
  },
}