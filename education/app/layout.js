import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة التربية والتعليم العالي',
  description: 'لوحة تدقيق خدمات وزارة التربية والتعليم العالي'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
