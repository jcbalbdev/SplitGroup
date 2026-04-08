// src/components/shared/PayerSummary.jsx
// Muestra resumen de quién paga y entre quiénes se divide, con avatares.
// Reutilizado por BudgetDetailModal y AddBudgetPage.
import { Avatar } from '../ui/Avatar';

export function PayerSummary({ paidBy, participants = [], dn }) {
  if (paidBy === 'multiple') {
    const names = participants.map(p => dn(p.user_email || p.email));
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex' }}>
          {participants.map((p, i) => (
            <div key={p.user_email || p.email} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: i }}>
              <Avatar email={p.user_email || p.email} size="xs" />
            </div>
          ))}
        </div>
        <span className="text-xs text-muted">
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{names.join(' y ')}</span>{' pagan'}
        </span>
      </div>
    );
  }

  const names = participants.map(p => dn(p.user_email || p.email));
  const participantText = !names.length ? '—'
    : names.length === 1 ? `solo ${names[0]}`
    : names.length === 2 ? `${names[0]} y ${names[1]}`
    : `${names.length} personas`;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <Avatar email={paidBy} size="xs" />
      <span className="text-xs text-muted">
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dn(paidBy)}</span>
        {' paga · entre '}{participantText}
      </span>
    </div>
  );
}
