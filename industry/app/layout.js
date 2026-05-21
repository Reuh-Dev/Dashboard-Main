import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الصناعة',
  description: 'لوحة تدقيق خدمات وزارة الصناعة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
