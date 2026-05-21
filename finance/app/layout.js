import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة المالية',
  description: 'لوحة تدقيق خدمات وزارة المالية'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
