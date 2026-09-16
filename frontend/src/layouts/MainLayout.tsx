import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="public-shell flex min-h-screen flex-col overflow-x-clip bg-surface-page text-content-primary transition-colors duration-standard">
      <Header />
      <main className="flex-1">
        <div key={pathname} className="page-stage min-h-full">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
