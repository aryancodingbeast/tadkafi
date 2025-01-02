import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { SupabaseProvider } from '@/lib/supabase-context'
import { CartProvider } from '@/lib/cart-context'
import { CartButton } from '@/components/cart-button'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'E-commerce Store',
  description: 'A modern e-commerce store built with Next.js and Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <CartProvider>
            <div className="min-h-screen">
              <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                  <div className="flex flex-1 items-center justify-between">
                    <nav>
                      {/* Add your navigation items here */}
                    </nav>
                    <CartButton />
                  </div>
                </div>
              </header>
              <main className="container py-6">{children}</main>
            </div>
            <Toaster />
          </CartProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
