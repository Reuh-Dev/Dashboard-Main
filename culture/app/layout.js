import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الثقافة',
  description: 'لوحة تدقيق خدمات وزارة الثقافة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
