import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الشباب والرياضة',
  description: 'لوحة تدقيق خدمات وزارة الشباب والرياضة'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
