import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from './supabase-context'
import { toast } from 'sonner'

interface CartItem {
  id: string
  product_id: string
  quantity: number
  product: {
    name: string
    price: number
    image_url: string
  }
}

interface CartContextType {
  cartItems: CartItem[]
  addToCart: (productId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  isLoading: boolean
  createOrder: (shippingAddress: any) => Promise<string>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user } = useSupabase()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCartItems()
    } else {
      setCartItems([])
      setIsLoading(false)
    }
  }, [user])

  const fetchCartItems = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          products (
            name,
            price,
            image_url
          )
        `)
        .eq('user_id', user?.id)

      if (error) throw error

      setCartItems(data || [])
    } catch (error) {
      console.error('Error fetching cart:', error)
      toast.error('Failed to load cart items')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = async (productId: string) => {
    if (!user) {
      toast.error('Please sign in to add items to cart')
      return
    }

    try {
      setIsLoading(true)
      
      // Check if item already exists in cart
      const existingItem = cartItems.find(item => item.product_id === productId)
      
      if (existingItem) {
        // Update quantity if item exists
        await updateQuantity(existingItem.id, existingItem.quantity + 1)
      } else {
        // Add new item if it doesn't exist
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          })

        if (error) throw error
        
        await fetchCartItems()
      }
      
      toast.success('Added to cart')
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart')
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId)
      return
    }

    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)

      if (error) throw error

      await fetchCartItems()
    } catch (error) {
      console.error('Error updating quantity:', error)
      toast.error('Failed to update quantity')
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await fetchCartItems()
      toast.success('Item removed from cart')
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error('Failed to remove item')
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user?.id)

      if (error) throw error

      setCartItems([])
      toast.success('Cart cleared')
    } catch (error) {
      console.error('Error clearing cart:', error)
      toast.error('Failed to clear cart')
    } finally {
      setIsLoading(false)
    }
  }

  const createOrder = async (shippingAddress: any) => {
    if (!user || cartItems.length === 0) {
      throw new Error('Cannot create order: Cart is empty or user is not logged in')
    }

    try {
      setIsLoading(true)

      // Start a transaction by creating the order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          shipping_address: shippingAddress,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items from cart items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Clear the cart after successful order creation
      await clearCart()

      toast.success('Order created successfully!')
      return order.id
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      isLoading,
      createOrder
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
