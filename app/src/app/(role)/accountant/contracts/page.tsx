'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Download, Eye, Printer, Loader2, Inbox, FileSignature, CheckCircle, Clock, XCircle, CalendarRange, X } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { getAllContracts } from '@/lib/firebase/firestore';
import type { Contract, ContractStatus, JobCategory } from '@/types';
import { JOB_CATEGORIES } from '@/types';
import styles from './page.module.css';

// ─── Constants ───
const STATUS_MAP: Record<ContractStatus, { label: string; variant: string }> = {
  active:            { label: 'Đang hiệu lực', variant: 'success' },
  completed:         { label: 'Đã thanh lý',   variant: 'default' },
  pending_signature: { label: 'Chờ ký',         variant: 'warning' },
  draft:             { label: 'Nháp',           variant: 'default' },
  terminated:        { label: 'Đã hủy',         variant: 'error' },
};

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom' | 'all';

// ─── Helpers ───
function toDate(d: unknown): Date | null {
  if (!d) return null;
  if (typeof d === 'object' && d !== null && 'toDate' in d)
    return (d as { toDate: () => Date }).toDate();
  if (d instanceof Date) return d;
  const parsed = new Date(d as string);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const formatDate = (d: unknown): string => {
  const date = toDate(d);
  return date ? date.toLocaleDateString('vi-VN') : '-';
};

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}₫`;

function getDateRange(preset: DatePreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      return { start: startOfDay(monday), end: endOfDay(now) };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    default:
      return { start: null, end: null };
  }
}

// ─── Print Contract Helper ───
function handlePrintContract(contract: Contract) {
  import('@/lib/pdf/contract-pdf').then(({ printContractPdf }) => {
    printContractPdf(contract);
  });
}

// ─── Export CSV ───
function exportContractsCsv(contracts: Contract[]) {
  const headers = ['Số HĐ', 'Dự án', 'Chuyên môn', 'Bên B (Freelancer)', 'CCCD', 'Giá trị', 'Trạng thái', 'Ngày tạo', 'Ngày ký'];
  const rows = contracts.map(c => [
    c.contractNumber,
    `"${c.jobTitle.replace(/"/g, '""')}"`,
    c.jobCategory || '',
    `"${c.partyB.name}"`,
    c.partyB.idNumber,
    c.totalValue,
    STATUS_MAP[c.status]?.label || c.status,
    formatDate(c.createdAt),
    formatDate(c.signedByWorkerAt),
  ]);

  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hop-dong-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════
// ── Main Component ──
// ═══════════════════════════════
export default function AccountantContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<JobCategory | 'all'>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [viewContract, setViewContract] = useState<Contract | null>(null);

  // Fetch all contracts
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const result = await getAllContracts(200);
        setContracts(result.items);
      } catch (err) {
        console.error('Failed to load contracts:', err);
      }
      setLoading(false);
    };
    fetchContracts();
  }, []);

  // Filtering logic
  const filtered = useMemo(() => {
    return contracts.filter(c => {
      // Search
      if (search) {
        const s = search.toLowerCase();
        const matches =
          c.contractNumber.toLowerCase().includes(s) ||
          c.jobTitle.toLowerCase().includes(s) ||
          c.partyB.name.toLowerCase().includes(s);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Category
      if (categoryFilter !== 'all' && c.jobCategory !== categoryFilter) return false;

      // Date range
      const contractDate = toDate(c.createdAt);
      if (contractDate) {
        if (datePreset !== 'all' && datePreset !== 'custom') {
          const { start, end } = getDateRange(datePreset);
          if (start && contractDate < start) return false;
          if (end && contractDate > end) return false;
        }
        if (datePreset === 'custom') {
          if (customFrom) {
            const from = new Date(customFrom);
            if (contractDate < from) return false;
          }
          if (customTo) {
            const to = new Date(customTo);
            to.setHours(23, 59, 59, 999);
            if (contractDate > to) return false;
          }
        }
      }

      return true;
    });
  }, [contracts, search, statusFilter, categoryFilter, datePreset, customFrom, customTo]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      pending: contracts.filter(c => c.status === 'pending_signature').length,
      completed: contracts.filter(c => c.status === 'completed').length,
    };
  }, [contracts]);

  const handleDatePresetClick = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setCustomFrom('');
      setCustomTo('');
    }
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}><Loader2 size={24} className={styles.spin} /> Đang tải hợp đồng...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Hợp đồng</h1>
          <p className={styles.subtitle}>Tra cứu, xem và xuất hợp đồng giao khoán trên hệ thống.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={() => exportContractsCsv(filtered)}>
            <Download size={16} /> Xuất CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconTotal}`}><FileSignature size={22} /></div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Tổng hợp đồng</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconActive}`}><CheckCircle size={22} /></div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Đang hiệu lực</div>
            <div className={styles.statValue}>{stats.active}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPending}`}><Clock size={22} /></div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Chờ ký</div>
            <div className={styles.statValue}>{stats.pending}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconCompleted}`}><XCircle size={22} /></div>
          <div className={styles.statInfo}>
            <div className={styles.statLabel}>Đã thanh lý</div>
            <div className={styles.statValue}>{stats.completed}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, dự án, freelancer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {/* Category filter */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Chuyên môn</span>
            <select
              className={styles.filterSelect}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as JobCategory | 'all')}
            >
              <option value="all">Tất cả</option>
              {JOB_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className={styles.statusFilters}>
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'active', label: 'Hiệu lực' },
              { key: 'pending_signature', label: 'Chờ ký' },
              { key: 'completed', label: 'Thanh lý' },
              { key: 'terminated', label: 'Đã hủy' },
            ].map(f => (
              <button
                key={f.key}
                className={`${styles.filterBtn} ${statusFilter === f.key ? styles.active : ''}`}
                onClick={() => setStatusFilter(f.key as ContractStatus | 'all')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className={styles.dateRangeSection}>
        <CalendarRange size={16} style={{ color: 'var(--color-text-muted)' }} />
        <span className={styles.filterLabel}>Thời gian</span>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'today', label: 'Hôm nay' },
          { key: 'this_week', label: 'Tuần này' },
          { key: 'this_month', label: 'Tháng này' },
          { key: 'custom', label: 'Tùy chọn' },
        ].map(p => (
          <button
            key={p.key}
            className={`${styles.datePresetBtn} ${datePreset === p.key ? styles.datePresetActive : ''}`}
            onClick={() => handleDatePresetClick(p.key as DatePreset)}
          >
            {p.label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <div className={styles.dateInputs}>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <span className={styles.dateSeparator}>→</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Số hợp đồng</th>
                <th>Dự án</th>
                <th>Freelancer (Bên B)</th>
                <th>Giá trị</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th className={styles.tAction}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(contract => (
                <tr key={contract.id}>
                  <td>
                    <span
                      className={styles.tContractNum}
                      onClick={() => setViewContract(contract)}
                      title="Xem chi tiết"
                    >
                      {contract.contractNumber}
                    </span>
                  </td>
                  <td>
                    <div className={styles.tJob}>{contract.jobTitle}</div>
                    {contract.jobCategory && (
                      <span className={styles.tCategory}>{contract.jobCategory}</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.tParty}>
                      <div className={styles.tPartyName}>{contract.partyB.name}</div>
                      <div className={styles.tPartyRole}>CCCD: {contract.partyB.idNumber}</div>
                    </div>
                  </td>
                  <td className={styles.tValue}>{formatCurrency(contract.totalValue)}</td>
                  <td className={styles.tDate}>{formatDate(contract.createdAt)}</td>
                  <td>
                    {/* @ts-expect-error Badge variant type mismatch */}
                    <Badge variant={STATUS_MAP[contract.status]?.variant || 'default'} size="sm">
                      {STATUS_MAP[contract.status]?.label || contract.status}
                    </Badge>
                  </td>
                  <td className={styles.tAction}>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.iconBtn}
                        title="Xem chi tiết"
                        onClick={() => setViewContract(contract)}
                      >
                        <Eye size={16} />
                      </button>
                      {(contract.pdfURL || contract.signedPdfURL) && (
                        <a
                          href={contract.signedPdfURL || contract.pdfURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Tải PDF"
                        >
                          <button className={`${styles.iconBtn} ${styles.iconBtnDownload}`}>
                            <Download size={16} />
                          </button>
                        </a>
                      )}
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnPrint}`}
                        title="Xuất PDF (in)"
                        onClick={() => handlePrintContract(contract)}
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              <Inbox size={32} />
              <p>{contracts.length === 0 ? 'Chưa có hợp đồng nào trên hệ thống.' : 'Không tìm thấy hợp đồng phù hợp với bộ lọc.'}</p>
            </div>
          )}
        </div>

        <div className={styles.tableFooter}>
          <span className={styles.resultCount}>
            Hiển thị <strong>{filtered.length}</strong> / {contracts.length} hợp đồng
          </span>
        </div>
      </Card>

      {/* Contract Detail Modal */}
      {viewContract && (
        <div className={styles.modalOverlay} onClick={() => setViewContract(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Chi tiết hợp đồng</h2>
              <button className={styles.modalClose} onClick={() => setViewContract(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Contract info */}
              <div className={styles.modalSection}>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Số hợp đồng</span>
                  <span className={styles.modalValue}><strong>{viewContract.contractNumber}</strong></span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Trạng thái</span>
                  {/* @ts-expect-error Badge variant type mismatch */}
                  <Badge variant={STATUS_MAP[viewContract.status]?.variant || 'default'} size="sm">
                    {STATUS_MAP[viewContract.status]?.label || viewContract.status}
                  </Badge>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tên dự án</span>
                  <span className={styles.modalValue}>{viewContract.jobTitle}</span>
                </div>
                {viewContract.jobCategory && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Chuyên môn</span>
                    <span className={styles.modalValue}>{viewContract.jobCategory}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Ngày tạo</span>
                  <span className={styles.modalValue}>{formatDate(viewContract.createdAt)}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Ngày ký</span>
                  <span className={styles.modalValue}>{formatDate(viewContract.signedByWorkerAt)}</span>
                </div>
              </div>

              {/* Party A */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Bên A (Công ty)</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tên công ty</span>
                  <span className={styles.modalValue}>{viewContract.partyA.name}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Đại diện</span>
                  <span className={styles.modalValue}>{viewContract.partyA.representative}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Chức vụ</span>
                  <span className={styles.modalValue}>{viewContract.partyA.position}</span>
                </div>
              </div>

              {/* Party B */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Bên B (Freelancer)</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Họ tên</span>
                  <span className={styles.modalValue}>{viewContract.partyB.name}</span>
                </div>
                {viewContract.partyB.dateOfBirth && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Ngày sinh</span>
                    <span className={styles.modalValue}>{viewContract.partyB.dateOfBirth}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>CMND/CCCD</span>
                  <span className={styles.modalValue}>{viewContract.partyB.idNumber}</span>
                </div>
                {viewContract.partyB.phone && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Số điện thoại</span>
                    <span className={styles.modalValue}>{viewContract.partyB.phone}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Địa chỉ</span>
                  <span className={styles.modalValue}>{viewContract.partyB.address}</span>
                </div>
                {viewContract.partyB.taxId && (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>Mã số thuế</span>
                    <span className={styles.modalValue}>{viewContract.partyB.taxId}</span>
                  </div>
                )}
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tài khoản NH</span>
                  <span className={styles.modalValue}>
                    {viewContract.partyB.bankAccount} - {viewContract.partyB.bankName}
                    {viewContract.partyB.bankBranch ? ` - ${viewContract.partyB.bankBranch}` : ''}
                  </span>
                </div>
              </div>

              {/* Scope */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Nội dung công việc</h3>
                <p className={styles.modalText}>{viewContract.scope}</p>
                {viewContract.jobDescription && (
                  <p className={styles.modalText} style={{ marginTop: 8 }}>{viewContract.jobDescription}</p>
                )}
              </div>

              {/* Value & Payment */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Giá trị &amp; thanh toán</h3>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Tổng giá trị</span>
                  <span className={styles.modalValue}><strong>{formatCurrency(viewContract.totalValue)}</strong></span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Điều khoản</span>
                  <span className={styles.modalValue}>{viewContract.paymentTerms}</span>
                </div>
              </div>

              {/* Milestones */}
              {viewContract.milestones && viewContract.milestones.length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Các mốc thanh toán</h3>
                  <div className={styles.milestonesTable}>
                    <div className={styles.msHeader}>
                      <span>Mốc</span>
                      <span>Tỷ lệ</span>
                      <span>Số tiền</span>
                      <span>Trạng thái</span>
                    </div>
                    {viewContract.milestones.map((ms, idx) => (
                      <div key={ms.id || idx} className={styles.msRow}>
                        <span className={styles.msName}>{ms.name}</span>
                        <span>{ms.percentage}%</span>
                        <span>{formatCurrency(ms.amount)}</span>
                        <Badge
                          variant={ms.status === 'paid' ? 'success' : ms.status === 'approved' || ms.status === 'released' ? 'warning' : 'default'}
                          size="sm"
                        >
                          {ms.status === 'paid' ? 'Đã TT' : ms.status === 'approved' ? 'Đã duyệt' : ms.status === 'released' ? 'Giải ngân' : ms.status === 'in_progress' ? 'Đang TH' : 'Chờ'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review notes */}
              {viewContract.reviewNotes && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Ghi chú duyệt</h3>
                  <p className={styles.modalText}>{viewContract.reviewNotes}</p>
                </div>
              )}

              {/* Terms */}
              {viewContract.terms && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Điều khoản hợp đồng</h3>
                  <p className={styles.modalText}>{viewContract.terms}</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button variant="outline" size="sm" onClick={() => handlePrintContract(viewContract)}>
                <Printer size={14} /> Xuất PDF
              </Button>
              {(viewContract.pdfURL || viewContract.signedPdfURL) && (
                <a href={viewContract.signedPdfURL || viewContract.pdfURL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><Download size={14} /> Tải PDF</Button>
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={() => setViewContract(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
