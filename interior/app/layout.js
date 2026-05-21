import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الداخلية والبلديات',
  description: 'لوحة تدقيق خدمات وزارة الداخلية والبلديات'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
