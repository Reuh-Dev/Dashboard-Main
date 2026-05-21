import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الطاقة والمياه',
  description: 'لوحة تدقيق خدمات وزارة الطاقة والمياه'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
