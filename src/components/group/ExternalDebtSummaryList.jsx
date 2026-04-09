// src/components/group/ExternalDebtSummaryList.jsx
// Lista de solo lectura "Prestado" que aparece en el tab Gastos
// de grupos individuales. Muestra cada deuda con su badge de estado.
import { DebtStatusBadge } from '../ui/DebtStatusBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short',
  });
};

export function ExternalDebtSummaryList({ externalDebts, onDebtClick }) {
  if (!externalDebts || externalDebts.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Encabezado de sección */}
      <div style={{
        fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        paddingLeft: 4, marginBottom: 10,
      }}>
        Prestado · {externalDebts.length}
      </div>

      {/* Listado */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,0,0,0.04)',
      }}>
        {externalDebts.map((d, idx) => (
          <div
            key={d.id}
            onClick={() => onDebtClick?.(d)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: idx < externalDebts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              cursor: onDebtClick ? 'pointer' : 'default',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { if (onDebtClick) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Ícono estado */}
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: d.status === 'settled' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>
              {d.status === 'settled' ? '✓' : '↗'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {d.description || d.debtor_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {d.debtor_name}
                {d.category ? ` · ${d.category}` : ''}
                {' · '}{formatDate(d.date)}
              </div>
            </div>

            {/* Monto + badge */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontWeight: 700, fontSize: '0.88rem',
                color: d.status === 'settled' ? 'var(--success)' : 'var(--text-primary)',
              }}>
                S/. {parseFloat(d.amount).toFixed(2)}
              </div>
              <div style={{ marginTop: 3 }}>
                <DebtStatusBadge status={d.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
