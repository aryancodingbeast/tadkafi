import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export function CartItems() {
  const { cartItems, updateQuantity, removeFromCart, isLoading } = useCart()

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-16 w-16" />
            <div className="flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="mt-2 h-4 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        Your cart is empty
      </div>
    )
  }

  return (
    <div className="space-y-4 py-4">
      {cartItems.map((item) => (
        <div key={item.id} className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-md">
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{item.product.name}</h3>
            <p className="text-sm text-muted-foreground">
              ${item.product.price.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeFromCart(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
