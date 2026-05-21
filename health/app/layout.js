import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الصحة العامة',
  description: 'لوحة تدقيق خدمات وزارة الصحة العامة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
