import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'University Hub',
  description: 'Search university programmes, locations, levels, duration and fees.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
