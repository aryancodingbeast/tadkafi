import { type Product } from '@/lib/database.types';
import { Button } from '../ui/button';
import { IndianRupee } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onEdit }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-gray-600 text-sm mt-1">{product.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center">
          <IndianRupee className="w-4 h-4 mr-1" />
          <span className="text-lg font-bold">{product.price}</span>
          <span className="text-gray-500 text-sm ml-1">per {product.unit}</span>
        </div>
        <div className="space-x-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
              Edit
            </Button>
          )}
          {onAddToCart && (
            <Button size="sm" onClick={() => onAddToCart(product)}>
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}