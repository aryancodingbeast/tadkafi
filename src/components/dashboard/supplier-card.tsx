import type { Database } from '@/lib/database.types';
import { Button } from '../ui/button';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SupplierCardProps {
  supplier: Profile;
  onViewProducts?: (supplier: Profile) => void;
}

export function SupplierCard({ supplier, onViewProducts }: SupplierCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{supplier.business_name}</h3>
      {supplier.address && (
        <p className="text-gray-600 text-sm mt-1">{supplier.address}</p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {supplier.contact_email}
          {supplier.phone && <span className="ml-2">{supplier.phone}</span>}
        </div>
        <div>
          {onViewProducts && (
            <Button size="sm" onClick={() => onViewProducts(supplier)}>
              View Products
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
