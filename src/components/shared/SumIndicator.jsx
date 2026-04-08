// src/components/shared/SumIndicator.jsx
// Indicador visual de si las sumas de split cuadran — estilo iOS minimalista.
import { formatAmount } from '../../utils/balanceCalculator';

export function SumIndicator({ ok, diff, total, mode }) {
  return (
    <div style={{
      marginTop: 8, padding: '10px 14px', borderRadius: 12,
      background: ok ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      border: `1px solid ${ok ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)'}`,
    }}>
      <span style={{
        fontSize: '0.78rem', fontWeight: 600,
        color: ok ? 'var(--success)' : 'var(--danger)',
      }}>
        {ok ? '✓ Sumas correctas' : '✕ Sin asignar'}
      </span>
      <span style={{
        fontSize: '0.82rem', fontWeight: 700,
        color: ok ? 'var(--success)' : 'var(--danger)',
      }}>
        {mode === 'percent'
          ? ok ? '100%' : `${diff.toFixed(1)}%`
          : ok ? formatAmount(total) : formatAmount(diff)}
      </span>
    </div>
  );
}
