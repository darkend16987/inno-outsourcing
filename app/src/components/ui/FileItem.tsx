import React from 'react';
import { FileText, File } from 'lucide-react';

/**
 * Detect if a URL points to a known non-image file type.
 * Returns the file extension label if non-image, or null for images.
 */
const NON_IMAGE_EXTENSIONS = [
  'dwg', 'rvt', 'skp', 'ifc', 'dxf', '3ds', 'fbx', 'obj', 'stl',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'rar', '7z', 'tar', 'gz',
  'csv', 'txt', 'rtf',
  'mp4', 'avi', 'mov', 'mkv',
  'dwf', 'nwd', 'nwf', 'nwc',
];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'avif'];

export function getFileExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    return ext || null;
  } catch {
    // Fallback: try splitting the raw string
    const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    return ext || null;
  }
}

export function isImageUrl(url: string): boolean {
  const ext = getFileExtension(url);
  if (!ext) return true; // Default to image if we can't determine
  if (IMAGE_EXTENSIONS.includes(ext)) return true;
  if (NON_IMAGE_EXTENSIONS.includes(ext)) return false;
  // Firebase Storage URLs without clear extension — treat as image
  if (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) return true;
  return true; // Default assumption
}

export function getFileLabel(url: string): string {
  const ext = getFileExtension(url);
  if (!ext) return 'File';
  return ext.toUpperCase();
}

/**
 * Renders a file item — either an image thumbnail or a file icon link.
 * Uses inline styles to avoid needing extra CSS.
 */
export function FileItem({ url, index, className }: { url: string; index: number; className?: string }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`File ${index + 1}`} />
      </a>
    );
  }

  const ext = getFileLabel(url);
  const fileName = (() => {
    try {
      const pathname = decodeURIComponent(new URL(url).pathname);
      return pathname.split('/').pop() || `file.${ext.toLowerCase()}`;
    } catch {
      return `file.${ext.toLowerCase()}`;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '16px 12px',
        background: 'var(--color-surface, #f8f9fa)',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: 10,
        textDecoration: 'none',
        color: 'var(--color-text, #1a1a2e)',
        minHeight: 100,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary, #4f46e5)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(79,70,229,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #e5e7eb)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {ext === 'PDF' ? (
        <FileText size={32} style={{ color: '#e74c3c' }} />
      ) : (
        <File size={32} style={{ color: 'var(--color-text-muted, #6b7280)' }} />
      )}
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 4,
        background: ext === 'PDF' ? 'rgba(231,76,60,0.1)' :
          ['DWG', 'RVT', 'IFC'].includes(ext) ? 'rgba(52,152,219,0.1)' :
            'rgba(107,114,128,0.1)',
        color: ext === 'PDF' ? '#e74c3c' :
          ['DWG', 'RVT', 'IFC'].includes(ext) ? '#3498db' :
            'var(--color-text-muted, #6b7280)',
      }}>
        {ext}
      </span>
      <span style={{
        fontSize: 11,
        color: 'var(--color-text-muted, #6b7280)',
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {fileName}
      </span>
    </a>
  );
}
