// src/components/ui/DebtStatusBadge.jsx
// Badge reutilizable para el estado de una deuda: "Pendiente" (naranja) o "✓ Cobrado" (verde).

const STYLES = {
  settled: {
    background: 'rgba(52,199,89,0.1)',
    color: 'var(--success)',
  },
  pending: {
    background: 'rgba(255,149,0,0.1)',
    color: 'var(--warning, #ff9500)',
  },
};

export function DebtStatusBadge({ status }) {
  const isSettled = status === 'settled';
  const palette   = isSettled ? STYLES.settled : STYLES.pending;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 6,
      fontSize: '0.65rem', fontWeight: 700,
      ...palette,
    }}>
      {isSettled ? '✓ Cobrado' : 'Pendiente'}
    </span>
  );
}
