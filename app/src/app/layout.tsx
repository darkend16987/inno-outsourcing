import type { Metadata } from 'next';
import { Providers } from '@/lib/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAA JOB — Nền tảng Outsourcing Thiết kế Xây dựng',
  description:
    'Kết nối freelancer với dự án thiết kế xây dựng: Kiến trúc, Kết cấu, MEP, BIM. Ứng tuyển, quản lý tiến độ, thanh toán — tất cả trên một nền tảng.',
  keywords: ['outsourcing', 'thiết kế xây dựng', 'freelancer', 'kiến trúc', 'BIM', 'MEP'],
  openGraph: {
    title: 'VAA JOB — Nền tảng Outsourcing Thiết kế Xây dựng',
    description: 'Kết nối freelancer với dự án thiết kế xây dựng chuyên nghiệp.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body>
        <Providers>
          <div id="app-root">{children}</div>
          <div id="modal-root" />
          <div id="toast-root" />
        </Providers>
      </body>
    </html>
  );
}
