import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  circle?: boolean;
}

export function Skeleton({ 
  width, 
  height, 
  borderRadius, 
  className = '', 
  circle = false 
}: SkeletonProps) {
  const customStyles: React.CSSProperties = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: circle ? '50%' : (borderRadius || 'var(--radius-sm)'),
  };

  return (
    <div 
      className={`${styles.skeleton} ${className}`} 
      style={customStyles}
    />
  );
}
