import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الدفاع الوطني',
  description: 'لوحة تدقيق خدمات وزارة الدفاع الوطني'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
