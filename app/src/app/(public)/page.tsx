import { Metadata } from 'next';
import LandingClient from './LandingClient';

export const metadata: Metadata = {
  title: 'VAA JOB — Nền tảng Outsourcing Thiết kế Xây dựng',
  description: 'Kết nối freelancer chuyên ngành thiết kế xây dựng với các dự án Kiến trúc, Kết cấu, MEP, BIM, Dự toán. Tìm việc hoặc tuyển dụng ngay hôm nay!',
  keywords: ['outsourcing', 'thiết kế xây dựng', 'freelancer', 'kiến trúc', 'kết cấu', 'MEP', 'BIM', 'dự toán'],
  openGraph: {
    title: 'VAA JOB — Nền tảng Outsourcing Thiết kế Xây dựng',
    description: 'Kết nối freelancer chuyên ngành thiết kế xây dựng với các dự án chất lượng cao.',
    type: 'website',
  },
};

export default function LandingPage() {
  return <LandingClient />;
}
