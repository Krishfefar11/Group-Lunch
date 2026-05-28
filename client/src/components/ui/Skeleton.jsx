import { colors, radius } from '../../design-system/tokens';

export default function Skeleton({ width = '100%', height = 16, borderRadius, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: borderRadius || radius.sm,
      background:   `linear-gradient(90deg, ${colors.bg.raised} 25%, ${colors.bg.overlay} 50%, ${colors.bg.raised} 75%)`,
      backgroundSize: '200% 100%',
      animation:    'shimmer 1.6s ease-in-out infinite',
      flexShrink:   0,
      ...style,
    }} />
  );
}

export function SkeletonText({ lines = 3, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 160, style = {} }) {
  return (
    <div style={{
      background:   colors.bg.surface,
      borderRadius: 16,
      overflow:     'hidden',
      ...style,
    }}>
      <Skeleton height={height} borderRadius="0" />
      <div style={{ padding: 16 }}>
        <Skeleton height={18} style={{ marginBottom: 10 }} />
        <Skeleton height={14} width="70%" />
      </div>
    </div>
  );
}
