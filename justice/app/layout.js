import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة العدل',
  description: 'لوحة تدقيق خدمات وزارة العدل'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
