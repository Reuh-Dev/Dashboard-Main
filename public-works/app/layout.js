import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الأشغال العامة والنقل',
  description: 'لوحة تدقيق خدمات وزارة الأشغال العامة والنقل'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
