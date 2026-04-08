// src/components/shared/SumIndicator.jsx
// Indicador visual de si las sumas de split cuadran. Usado por PayerSection y SplitSection.
import { formatAmount } from '../../utils/balanceCalculator';

export function SumIndicator({ ok, diff, total, mode }) {
  return (
    <div style={{
      marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: ok ? 'var(--success-soft)' : 'var(--danger-soft)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        {ok ? '✅ Sumas correctas' : 'Sin asignar'}
      </span>
      <span className={`font-bold text-sm ${ok ? 'text-success' : 'text-danger'}`}>
        {mode === 'percent'
          ? ok ? '100%' : `${diff.toFixed(1)}%`
          : ok ? formatAmount(total) : formatAmount(diff)}
      </span>
    </div>
  );
}
