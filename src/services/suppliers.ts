import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const supplierService = {
  async getSuppliers() {
    console.log('Getting suppliers');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('type', 'supplier');
    
    console.log('Suppliers query result:', { data, error });
    if (error) throw error;
    return data as Profile[];
  }
};
