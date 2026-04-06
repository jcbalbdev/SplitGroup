// src/components/ui/Skeleton.jsx

export function Skeleton({ height = 60, radius = 12, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, borderRadius: radius }}
    />
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="list" style={{ gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={72} />
      ))}
    </div>
  );
}
