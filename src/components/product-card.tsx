import { ShoppingCart } from 'lucide-react'
import { Button } from './ui/button'
import { useCart } from '@/lib/cart-context'
import { useAuthStore } from '@/store/auth'
import { useState } from 'react'
import { QuantityDialog } from './quantity-dialog'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock_quantity: number
  supplier_id: string
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isLoading } = useCart()
  const { profile } = useAuthStore()
  const [showQuantityDialog, setShowQuantityDialog] = useState(false)

  const handleAddToCart = async (quantity: number) => {
    await addToCart(product.id, quantity)
  }

  const isRestaurant = profile?.type === 'restaurant'

  return (
    <div className="group relative rounded-lg border p-3 sm:p-4 hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden rounded-md">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="mt-3 sm:mt-4">
        <h3 className="text-base sm:text-lg font-medium line-clamp-1">{product.name}</h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-medium">
              ₹{product.price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              Stock: {product.stock_quantity}
            </span>
          </div>
          {isRestaurant && (
            <Button
              variant="default"
              size="sm"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
              onClick={() => setShowQuantityDialog(true)}
              disabled={isLoading || product.stock_quantity === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          )}
        </div>
      </div>

      {isRestaurant && (
        <QuantityDialog
          isOpen={showQuantityDialog}
          onClose={() => setShowQuantityDialog(false)}
          onConfirm={handleAddToCart}
          maxQuantity={product.stock_quantity}
          productName={product.name}
        />
      )}
    </div>
  )
}
