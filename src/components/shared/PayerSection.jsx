// src/components/shared/PayerSection.jsx
// Sección "¿Quién paga?" — rediseñado estilo iOS minimalista.
import { Avatar } from '../ui/Avatar';
import { SumIndicator } from './SumIndicator';

export function PayerSection({
  members, paidBy, setPaidBy,
  isMultiplePayers, setIsMultiplePayers,
  payers, setPayers,
  payersDiff, payersTotal, totalAmount,
  dn,
  allowMultiPayer = true,
}) {

  const SegmentedControl = ({ options, value, onChange }) => (
    <div style={{
      display: 'inline-flex', gap: 3,
      background: 'rgba(0, 0, 0, 0.04)', borderRadius: 10, padding: 3,
    }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button"
            onClick={() => onChange(opt.value)}
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
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          ¿Quién paga?
        </span>
        {allowMultiPayer && (
          <SegmentedControl
            options={[
              { value: false, label: 'Un pagador' },
              { value: true, label: 'Múltiples' },
            ]}
            value={isMultiplePayers}
            onChange={setIsMultiplePayers}
          />
        )}
      </div>

      {!isMultiplePayers ? (
        /* Un pagador — pills de miembros */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {members.map(m => {
            const email = m.user_email || m.email;
            const sel = paidBy === email;
            return (
              <button
                key={email} type="button"
                onClick={() => setPaidBy(email)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 12,
                  background: sel ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  border: sel ? '1.5px solid rgba(0, 0, 0, 0.12)' : '1.5px solid transparent',
                  color: sel ? 'var(--text-primary)' : 'var(--text-muted)',
                  font: 'inherit', fontSize: '0.85rem', fontWeight: sel ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                <Avatar email={email} size="sm" />
                {dn(email)}
              </button>
            );
          })}
        </div>
      ) : (
        /* Múltiples pagadores — lista estilo iOS Settings */
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}>
          <p style={{
            padding: '10px 16px 8px', margin: 0,
            fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4,
          }}>
            Ingresa cuánto pagó cada uno. Los montos deben sumar el total.
          </p>
          {payers.map((p, i) => (
            <div key={p.email} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderTop: i === 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              borderBottom: i < payers.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            }}>
              <Avatar email={p.email} size="sm" />
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {dn(p.email)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>S/.</span>
                <input
                  className="input" type="number" min="0" step="0.01"
                  placeholder="0.00" value={p.amount}
                  onWheel={(e) => e.target.blur()}
                  onChange={e => setPayers(prev => prev.map(x => x.email === p.email ? { ...x, amount: e.target.value } : x))}
                  style={{
                    maxWidth: 80, textAlign: 'right', padding: '6px 10px',
                    borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                  }}
                />
              </div>
            </div>
          ))}
          {payersTotal > 0 && totalAmount > 0 && (
            <div style={{ padding: '8px 16px 12px' }}>
              <SumIndicator ok={Math.abs(payersDiff) < 0.05} diff={payersDiff} total={totalAmount} mode="amount" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
