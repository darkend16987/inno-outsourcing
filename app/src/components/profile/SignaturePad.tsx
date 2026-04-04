'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, Upload, Check } from 'lucide-react';
import styles from './SignaturePad.module.css';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Props {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
}

/**
 * Canvas-based signature pad.
 * - Captures mouse/touch input
 * - Uses Catmull-Rom spline to smooth stroke points → looks like a real signature
 * - Exports PNG data URL
 * - Also supports uploading a PNG image directly
 */
export function SignaturePad({ onSave, onClear, width = 520, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const pointsRef = useRef<Point[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  // ── Canvas setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  // Catmull-Rom → Bezier conversion for smooth curves
  const drawSmooth = useCallback((pts: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas || pts.length < 2) return;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        // Catmull-Rom → cubic bezier control points
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }
    ctx.stroke();
  }, []);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    const pt = getPoint(e);
    pointsRef.current = [pt];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    }
  };

  const continueDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const pt = getPoint(e);
    pointsRef.current.push(pt);
    // Keep last 5 points for smoothing (performance)
    if (pointsRef.current.length > 5) {
      drawSmooth(pointsRef.current.slice(-5));
      pointsRef.current = pointsRef.current.slice(-2);
    }
  };

  const endDraw = () => {
    if (!drawing) return;
    drawSmooth(pointsRef.current);
    pointsRef.current = [];
    setDrawing(false);
    // Auto-save on each stroke
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsEmpty(true);
    onClear?.();
  };

  // ── Upload mode ────────────────────────────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        // Fit image within canvas
        const scale = Math.min(width / img.width, height / img.height, 1);
        const dx = (width - img.width * scale) / 2;
        const dy = (height - img.height * scale) / 2;
        ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
        setIsEmpty(false);
        onSave(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'draw' ? styles.tabActive : ''}`}
          onClick={() => setMode('draw')}
        >
          ✍️ Ký bằng chuột
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'upload' ? styles.tabActive : ''}`}
          onClick={() => setMode('upload')}
        >
          <Upload size={13} /> Tải ảnh chữ ký
        </button>
      </div>

      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${mode === 'draw' ? styles.canvasDraw : styles.canvasView}`}
          onMouseDown={mode === 'draw' ? startDraw : undefined}
          onMouseMove={mode === 'draw' ? continueDraw : undefined}
          onMouseUp={mode === 'draw' ? endDraw : undefined}
          onMouseLeave={mode === 'draw' ? endDraw : undefined}
          onTouchStart={mode === 'draw' ? startDraw : undefined}
          onTouchMove={mode === 'draw' ? continueDraw : undefined}
          onTouchEnd={mode === 'draw' ? endDraw : undefined}
        />
        {isEmpty && mode === 'draw' && (
          <div className={styles.placeholder}>
            Ký tên vào đây
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.clearBtn} onClick={clearCanvas}>
          <Trash2 size={14} /> Xóa
        </button>
        {mode === 'upload' && (
          <button type="button" className={styles.uploadBtn} onClick={() => uploadRef.current?.click()}>
            <Upload size={14} /> Chọn ảnh chữ ký PNG
          </button>
        )}
        {!isEmpty && (
          <span className={styles.savedNote}><Check size={13} /> Chữ ký đã được lưu</span>
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUpload}
        className={styles.hiddenInput}
      />
    </div>
  );
}
