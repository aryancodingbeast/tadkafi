import { ShoppingCart } from 'lucide-react'
import { Button } from './ui/button'
import { useCart } from '@/lib/cart-context'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isLoading } = useCart()

  return (
    <div className="group relative rounded-lg border p-4 hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden rounded-md">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-medium">
            ${product.price.toFixed(2)}
          </span>
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => addToCart(product.id)}
            disabled={isLoading}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
