import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Servora Intelligence — AI Support & Operations Platform',
  description:
    'Modern, intelligent customer support platform powered by verified AI knowledge, human approval safeguards, and multi-tenant operational intelligence.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

