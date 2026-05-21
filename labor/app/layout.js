import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة العمل',
  description: 'لوحة تدقيق خدمات وزارة العمل'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
