import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الإعلام',
  description: 'لوحة تدقيق خدمات وزارة الإعلام'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
