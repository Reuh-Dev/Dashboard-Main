import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الاتصالات',
  description: 'لوحة تدقيق خدمات وزارة الاتصالات'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
