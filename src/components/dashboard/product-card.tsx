import { Button } from '@/components/ui/button';
import { Edit2, Trash2, ShoppingCart } from 'lucide-react';
import type { Product } from '@/lib/database.types';
import { useAuthStore } from '@/store/auth';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const { profile } = useAuthStore();
  const isSupplier = profile?.type === 'supplier';

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 text-sm">No image available</div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
          </div>
          <span className="text-lg font-bold text-blue-600">₹{product.price}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Unit:</span>
              <span className="text-sm text-gray-900">{product.unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Category:</span>
              <span className="text-sm text-gray-900 capitalize">{product.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Stock:</span>
              <span className="text-sm text-gray-900">{product.stock_quantity}</span>
            </div>
          </div>

          {isSupplier ? (
            <div className="flex gap-2">
              <Button
                onClick={() => onEdit?.(product)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => onDelete?.(product)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}