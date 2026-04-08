// src/components/shared/PayerSection.jsx
// Sección "¿Quién paga?" con toggle Un pagador / Múltiples.
// Reutilizado por ExpenseForm y BudgetItemForm.
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
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="input-label" style={{ margin: 0 }}>¿Quién paga?</div>
        {allowMultiPayer && (
          <div className="tabs" style={{ width: 'auto', gap: 2, padding: 3 }}>
            <div
              className={`tab ${!isMultiplePayers ? 'active' : ''}`}
              onClick={() => setIsMultiplePayers(false)}
              style={{ padding: '5px 14px', fontSize: '0.75rem', cursor: 'pointer' }}>
              Un pagador
            </div>
            <div
              className={`tab ${isMultiplePayers ? 'active' : ''}`}
              onClick={() => setIsMultiplePayers(true)}
              style={{ padding: '5px 14px', fontSize: '0.75rem', cursor: 'pointer' }}>
              Múltiples
            </div>
          </div>
        )}
      </div>

      {!isMultiplePayers ? (
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
                  padding: '8px 14px', borderRadius: 'var(--radius-full)',
                  background: sel ? 'var(--primary)' : 'var(--bg-hover)',
                  border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                  color: sel ? '#fff' : 'var(--text-secondary)',
                  font: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                <Avatar email={email} size="sm" />
                {dn(email)}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
            Ingresa cuánto pagó cada uno. Los montos deben sumar el total.
          </p>
          {payers.map(p => (
            <div key={p.email} className="participant-row">
              <Avatar email={p.email} size="sm" />
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {dn(p.email)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>S/.</span>
                <input
                  className="input" type="number" min="0" step="0.01"
                  placeholder="0.00" value={p.amount}
                  onChange={e => setPayers(prev => prev.map(x => x.email === p.email ? { ...x, amount: e.target.value } : x))}
                  style={{ maxWidth: 90, textAlign: 'right' }}
                />
              </div>
            </div>
          ))}
          {payersTotal > 0 && totalAmount > 0 && (
            <SumIndicator ok={Math.abs(payersDiff) < 0.05} diff={payersDiff} total={totalAmount} mode="amount" />
          )}
        </div>
      )}
    </div>
  );
}
