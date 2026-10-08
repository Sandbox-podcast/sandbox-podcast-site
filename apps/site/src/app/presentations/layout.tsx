import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Présentations Sandbox',
  description: 'Liste des supports de présentation des épisodes Sandbox.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#05090d',
  colorScheme: 'dark',
};

export default function PresentationsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#05090d',
          color: '#f4f7fa',
          fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
