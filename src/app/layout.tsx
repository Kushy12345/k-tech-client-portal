import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'K-Tech Technologies | Project discovery',
  description: 'Tell K-Tech Technologies what your business needs from its next website.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
