import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vinh danh | INNO Jobs',
  description: 'Bảng vinh danh các cá nhân, chuyên gia xuất sắc trên INNO Jobs',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
