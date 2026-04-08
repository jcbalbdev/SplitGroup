// src/components/group/DebtList.jsx
// Listado de deudas — estilo iOS minimalista
import { Avatar } from '../ui/Avatar';
import { FilterDropdown } from '../ui/FilterDropdown';
import { formatAmount, formatDate } from '../../utils/balanceCalculator';
import { Check, CircleCheck, PartyPopper, RotateCcw, Tag, CalendarDays } from 'lucide-react';

export function DebtList({
  filteredExpenseDebts,
  filteredPendingDebts,
  filteredSettledDebts,
  debtAvailableCatItems,
  datePresetItems,
  debtFilterCat, setDebtFilterCat,
  debtDatePreset, setDebtDatePreset,
  debtCustomFrom, setDebtCustomFrom,
  debtCustomTo,   setDebtCustomTo,
  onSettle, onUnsettle,
  getEmoji, dn,
}) {
  return (
    <div className="animate-fade-in">
      {/* Filtros */}
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterDropdown
            items={debtAvailableCatItems}
            activeKey={debtFilterCat}
            onSelect={setDebtFilterCat}
            icon={<Tag size={14} />} label="Categoría"
          />
          <FilterDropdown
            items={datePresetItems}
            activeKey={debtDatePreset}
            onSelect={setDebtDatePreset}
            icon={<CalendarDays size={14} />} label="Fecha"
          />
        </div>
        {debtDatePreset === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input className="input" type="date" value={debtCustomFrom} onChange={(e) => setDebtCustomFrom(e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>–</span>
            <input className="input" type="date" value={debtCustomTo} min={debtCustomFrom} onChange={(e) => setDebtCustomTo(e.target.value)} style={{ flex: 1 }} />
          </div>
        )}
      </div>

      {/* Lista */}
      {filteredExpenseDebts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-title">Sin deudas</div>
          <div className="empty-state-text">No hay gastos con deuda en este período</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Pendientes */}
          {filteredPendingDebts.length > 0 && (
            <>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4,
              }}>
                Pendientes · {filteredPendingDebts.length}
              </div>
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
              }}>
                {filteredPendingDebts.map((ed, idx) => (
                  <div key={ed.expenseId} style={{
                    padding: '14px 16px',
                    borderBottom: idx < filteredPendingDebts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    {/* Expense header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {getEmoji(ed.category, ed.description)} {ed.description}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {formatDate(ed.date)}
                      </span>
                    </div>
                    {/* Deudas individuales */}
                    {ed.debts.map((d) => (
                      <div key={d.debtor} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginTop: 6,
                      }}>
                        <Avatar email={d.debtor} size="sm" />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {dn(d.debtor)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>debe</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--danger)' }}>
                            {formatAmount(d.amount)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>a</span>
                          <Avatar email={ed.paidBy} size="xs" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {dn(ed.paidBy)}
                          </span>
                        </div>
                        <button
                          id={`settle-btn-${ed.expenseId}`}
                          onClick={() => onSettle(ed.expenseId)}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: 'none',
                            background: 'var(--text-primary)', color: '#fff',
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          }}
                        >
                          <Check size={12} /> Pagar
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Saldadas */}
          {filteredSettledDebts.length > 0 && (
            <>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <CircleCheck size={12} /> Saldadas · {filteredSettledDebts.length}
              </div>
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
              }}>
                {filteredSettledDebts.map((ed, idx) => (
                  <div key={ed.expenseId} style={{
                    padding: '12px 16px', opacity: 0.65,
                    borderBottom: idx < filteredSettledDebts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {getEmoji(ed.category, ed.description)} {ed.description}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 6px', borderRadius: 6,
                          background: 'rgba(52, 199, 89, 0.08)',
                          fontSize: '0.65rem', fontWeight: 600, color: 'var(--success)',
                        }}>
                          ✓ Saldado
                        </span>
                        <button
                          onClick={() => onUnsettle(ed.expenseId)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '2px 6px', borderRadius: 6,
                            fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)',
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <RotateCcw size={10} /> Reactivar
                        </button>
                      </div>
                    </div>
                    {/* Deudas */}
                    {ed.debts.map((d) => (
                      <div key={d.debtor} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2, marginTop: 4 }}>
                        <Avatar email={d.debtor} size="xs" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {dn(d.debtor)} pagó {formatAmount(d.amount)} a
                        </span>
                        <Avatar email={ed.paidBy} size="xs" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {dn(ed.paidBy)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredPendingDebts.length === 0 && filteredSettledDebts.length > 0 && (
            <div className="empty-state" style={{ marginTop: 8 }}>
              <div className="empty-state-icon"><PartyPopper size={40} strokeWidth={1.5} /></div>
              <div className="empty-state-title">¡Todo saldado!</div>
              <div className="empty-state-text">No hay deudas pendientes en este período</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
