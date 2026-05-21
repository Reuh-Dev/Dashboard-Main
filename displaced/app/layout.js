import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة المهجرين',
  description: 'لوحة تدقيق خدمات وزارة المهجرين'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
