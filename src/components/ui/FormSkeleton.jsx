// src/components/ui/FormSkeleton.jsx
// Skeleton genérico para formularios de gasto (Add / Edit).
// Evita duplicar este componente en AddExpensePage y EditExpensePage.

export function FormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div className="card skeleton" style={{ height: 110 }} />
      <div className="card skeleton" style={{ height: 160 }} />
      <div className="card skeleton" style={{ height: 110 }} />
      <div className="card skeleton" style={{ height: 140 }} />
    </div>
  );
}
