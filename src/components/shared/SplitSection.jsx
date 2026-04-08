// src/components/shared/SplitSection.jsx
// Sección "División de gastos" — rediseñado estilo iOS minimalista.
import { Avatar } from '../ui/Avatar';
import { SumIndicator } from './SumIndicator';

const SPLIT_MODES = { AMOUNT: 'amount', PERCENT: 'percent' };

export function SplitSection({
  participants, splitMode, setSplitMode,
  totalAmount, splitDiff,
  toggleParticipant, updateValue, splitEqually,
  dn,
}) {
  const selectedParticipants = participants.filter(p => p.selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          División de gastos
        </span>
        <div style={{
          display: 'inline-flex', gap: 3,
          background: 'rgba(0, 0, 0, 0.04)', borderRadius: 10, padding: 3,
        }}>
          {[
            { value: SPLIT_MODES.AMOUNT, label: 'S/.' },
            { value: SPLIT_MODES.PERCENT, label: '%' },
          ].map(opt => {
            const active = splitMode === opt.value;
            return (
              <button key={opt.value} type="button"
                onClick={() => setSplitMode(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dividir equitativamente */}
      {totalAmount > 0 && (
        <button type="button" onClick={splitEqually}
          style={{
            padding: '10px 16px', borderRadius: 12,
            border: '1.5px solid rgba(0, 0, 0, 0.08)', background: 'rgba(0, 0, 0, 0.02)',
            color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Dividir equitativamente
        </button>
      )}

      {/* Lista de participantes — estilo iOS Settings */}
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
      }}>
        {participants.map((p, i) => (
          <div key={p.email} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px',
            borderBottom: i < participants.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            opacity: p.selected ? 1 : 0.5,
            transition: 'opacity 0.2s ease',
          }}>
            {/* Toggle iOS-style */}
            <button type="button"
              onClick={() => toggleParticipant(p.email)}
              style={{
                width: 24, height: 24, borderRadius: 7, border: 'none',
                background: p.selected ? 'var(--primary)' : 'rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                flexShrink: 0,
              }}>
              {p.selected && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            <Avatar email={p.email} size="sm" />
            <span style={{
              flex: 1, fontSize: '0.85rem', fontWeight: 600,
              color: p.selected ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
              {dn(p.email)}
            </span>

            {p.selected && (
              <input
                className="input" type="number" min="0" step="0.01"
                max={splitMode === SPLIT_MODES.PERCENT ? 100 : undefined}
                placeholder={splitMode === SPLIT_MODES.PERCENT ? '0' : '0.00'}
                value={p.value}
                onWheel={(e) => e.target.blur()}
                onChange={e => updateValue(p.email, e.target.value)}
                style={{
                  maxWidth: 80, textAlign: 'right', padding: '6px 10px',
                  borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Indicador de suma */}
      {selectedParticipants.length > 0 && totalAmount > 0 && (
        <SumIndicator ok={Math.abs(splitDiff) < 0.05} diff={splitDiff} total={totalAmount} mode={splitMode} />
      )}
    </div>
  );
}

export { SPLIT_MODES };
