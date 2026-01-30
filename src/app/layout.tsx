import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Humor Project',
  description: 'A humor project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
