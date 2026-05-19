import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق مستندات وزارة الاقتصاد والتجارة',
  description: 'لوحة تدقيق خدمات وزارة الاقتصاد والتجارة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
