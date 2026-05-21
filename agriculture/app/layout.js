import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الزراعة',
  description: 'لوحة تدقيق خدمات وزارة الزراعة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
