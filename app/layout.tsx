import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Malaysia University Finder',
  description: 'Search Malaysia university programmes, fees and source information.',
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
