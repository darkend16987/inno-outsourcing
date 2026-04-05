import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, LevelBadge, StatusBadge } from '../Badge';

describe('Badge Components', () => {
  describe('Badge', () => {
    it('renders children correctly', () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('applies default classes correctly', () => {
      const { container } = render(<Badge>Default</Badge>);
      const span = container.firstChild as HTMLElement;
      expect(span.className).toContain('badge');
      expect(span.className).toContain('default');
    });

    it('applies size classes correctly', () => {
      const { container } = render(<Badge size="sm">Small</Badge>);
      const span = container.firstChild as HTMLElement;
      expect(span.className).toContain('sm');
    });

    it('renders a dot when dot prop is true', () => {
      const { container } = render(<Badge dot>With Dot</Badge>);
      const span = container.firstChild as HTMLElement;
      expect(span.className).toContain('withDot');
      
      // The first child of the wrapper span should be the dot span
      const dotSpan = span.firstElementChild as HTMLElement;
      expect(dotSpan.className).toContain('dot');
    });
  });

  describe('LevelBadge', () => {
    it('renders the correct level text and applies level class', () => {
      // Using type casting to bypass the specific JobLevel type for tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { container } = render(<LevelBadge level={"L3" as any} />);
      expect(screen.getByText('L3')).toBeInTheDocument();
      
      const span = container.firstChild as HTMLElement;
      expect(span.className).toContain('levelL3');
    });
  });

  describe('StatusBadge', () => {
    it('renders default status text', () => {
      render(<StatusBadge status="active" />);
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('renders custom label over status text', () => {
      render(<StatusBadge status="active" label="Đang hoạt động" />);
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.queryByText('active')).not.toBeInTheDocument();
    });
  });
});
