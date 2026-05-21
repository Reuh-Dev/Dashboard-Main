import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة البيئة',
  description: 'لوحة تدقيق خدمات وزارة البيئة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
