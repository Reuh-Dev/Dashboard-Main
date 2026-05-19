import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق مستندات وزارة السياحة',
  description: 'لوحة تدقيق خدمات وزارة السياحة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
