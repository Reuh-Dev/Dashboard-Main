import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الشؤون الاجتماعية',
  description: 'لوحة تدقيق خدمات وزارة الشؤون الاجتماعية'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
