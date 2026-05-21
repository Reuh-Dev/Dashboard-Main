import './globals.css';

export const metadata = {
  title: 'لوحة تدقيق خدمات وزارة الخارجية والمغتربين',
  description: 'لوحة تدقيق خدمات وزارة الخارجية والمغتربين'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
