'use client';

import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { type InvoiceData, formatInvoiceCurrency } from '@/lib/services/invoice-generator';
import styles from './InvoiceViewer.module.css';

interface InvoiceViewerProps {
  invoice: InvoiceData;
  onDownload?: () => void;
  className?: string;
}

export function InvoiceViewer({ invoice, onDownload, className }: InvoiceViewerProps) {
  const statusLabel = {
    draft: 'Nháp',
    issued: 'Đã phát hành',
    paid: 'Đã thanh toán',
  };

  const statusVariant = {
    draft: 'outline' as const,
    issued: 'info' as const,
    paid: 'success' as const,
  };

  return (
    <Card className={`${styles.invoice} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FileText size={20} className={styles.icon} />
          <div>
            <h3 className={styles.invoiceNumber}>{invoice.invoiceNumber}</h3>
            <span className={styles.date}>{invoice.date}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <Badge variant={statusVariant[invoice.status]}>{statusLabel[invoice.status]}</Badge>
          {onDownload && (
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download size={14} /> Tải PDF
            </Button>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className={styles.parties}>
        <div className={styles.party}>
          <h4 className={styles.partyLabel}>Bên A (Thuê)</h4>
          <p className={styles.partyName}>{invoice.partyA.name}</p>
          {invoice.partyA.email && <p className={styles.partyDetail}>{invoice.partyA.email}</p>}
          {invoice.partyA.phone && <p className={styles.partyDetail}>{invoice.partyA.phone}</p>}
        </div>
        <div className={styles.party}>
          <h4 className={styles.partyLabel}>Bên B (Thực hiện)</h4>
          <p className={styles.partyName}>{invoice.partyB.name}</p>
          {invoice.partyB.email && <p className={styles.partyDetail}>{invoice.partyB.email}</p>}
          {invoice.partyB.bankAccount && (
            <p className={styles.partyDetail}>TK: {invoice.partyB.bankAccount} — {invoice.partyB.bankName}</p>
          )}
        </div>
      </div>

      {/* Job info */}
      <div className={styles.jobInfo}>
        <span className={styles.jobLabel}>Dự án:</span>
        <span className={styles.jobTitle}>{invoice.jobTitle}</span>
        <Badge size="sm" variant="outline">{invoice.category}</Badge>
      </div>

      {/* Line items */}
      <div className={styles.items}>
        <div className={styles.itemHeader}>
          <span>Hạng mục</span>
          <span>Số tiền</span>
        </div>
        {invoice.items.map((item, idx) => (
          <div key={idx} className={styles.itemRow}>
            <span>{item.description}</span>
            <span className={styles.amount}>{formatInvoiceCurrency(item.amount)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className={styles.totalRow}>
        <span>Tổng cộng</span>
        <span className={styles.totalAmount}>{formatInvoiceCurrency(invoice.total)}</span>
      </div>

      {invoice.notes && (
        <p className={styles.notes}>{invoice.notes}</p>
      )}
    </Card>
  );
}
