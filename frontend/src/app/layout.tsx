import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        {import.meta.env.PROD && <Analytics />}
      </body>
    </html>
  )
}
