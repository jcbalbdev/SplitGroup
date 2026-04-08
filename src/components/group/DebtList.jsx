// src/components/group/DebtList.jsx
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
            <span className="text-xs text-muted">–</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Pendientes */}
          {filteredPendingDebts.length > 0 && (
            <>
              <div className="text-xs text-muted font-semibold" style={{ paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Pendientes · {filteredPendingDebts.length}
              </div>
              {filteredPendingDebts.map((ed) => (
                <div key={ed.expenseId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {getEmoji(ed.category, ed.description)} {ed.description}
                    </span>
                    <span className="text-xs text-muted">{formatDate(ed.date)}</span>
                  </div>
                  {ed.debts.map((d) => (
                    <div key={d.debtor} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar email={d.debtor} size="sm" />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dn(d.debtor)}</span>
                        <span className="text-xs text-muted"> debe </span>
                        <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>{formatAmount(d.amount)}</span>
                        <span className="text-xs text-muted"> a </span>
                        <Avatar email={ed.paidBy} size="xs" />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dn(ed.paidBy)}</span>
                      </div>
                      <button
                        id={`settle-btn-${ed.expenseId}`}
                        className="btn btn-success btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => onSettle(ed.expenseId)}
                      >
                        <Check size={14} /> Pagar
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Saldadas */}
          {filteredSettledDebts.length > 0 && (
            <>
              <div className="text-xs text-muted font-semibold" style={{ paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8, marginBottom: 4 }}>
                <CircleCheck size={13} /> Saldadas · {filteredSettledDebts.length}
              </div>
              {filteredSettledDebts.map((ed) => (
                <div key={ed.expenseId} style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.75 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {getEmoji(ed.category, ed.description)} {ed.description}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-xs" style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CircleCheck size={13} /> Saldado</span>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => onUnsettle(ed.expenseId)}><RotateCcw size={12} /> Reactivar</button>
                    </div>
                  </div>
                  {ed.debts.map((d) => (
                    <div key={d.debtor} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                      <Avatar email={d.debtor} size="xs" />
                      <span className="text-xs text-muted">{dn(d.debtor)} pagó {formatAmount(d.amount)} a </span>
                      <Avatar email={ed.paidBy} size="xs" />
                      <span className="text-xs text-muted">{dn(ed.paidBy)}</span>
                    </div>
                  ))}
                </div>
              ))}
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
