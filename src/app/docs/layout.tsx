import type { ReactNode } from 'react';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      {children}
    </section>
  );
}