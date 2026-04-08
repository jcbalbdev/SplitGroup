// src/components/group/ExpenseList.jsx
import { Avatar } from '../ui/Avatar';
import { FilterDropdown } from '../ui/FilterDropdown';
import { formatAmount, formatDate } from '../../utils/balanceCalculator';
import { getCategoryEmoji } from '../../utils/categories';
import { ChevronRight, Tag, CalendarDays } from 'lucide-react';

export function ExpenseList({
  filteredGrouped,
  availableCatItems,
  datePresetItems,
  filterCategory, setFilterCategory,
  datePreset, setDatePreset,
  customFrom, setCustomFrom,
  customTo, setCustomTo,
  onExpenseClick,
  onEditExpense,
  onEditSession,
  pendingDebtByExpenseId,
  settlements,
  getEmoji,
  dn,
}) {

  const StatusBadge = ({ type, text }) => {
    const colors = {
      settled: { bg: 'rgba(52, 199, 89, 0.08)', border: 'rgba(52, 199, 89, 0.15)', color: 'var(--success)' },
      pending: { bg: 'rgba(255, 59, 48, 0.08)', border: 'rgba(255, 59, 48, 0.15)', color: 'var(--danger)' },
    };
    const c = colors[type] || colors.settled;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 8,
        background: c.bg, border: `1px solid ${c.border}`,
        fontSize: '0.68rem', color: c.color, fontWeight: 600,
        lineHeight: 1.3,
      }}>{text}</span>
    );
  };

  const ExpenseRow = ({ emoji, title, amount, date, participants, onClick, onEdit, statusBadges }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        cursor: 'pointer', transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Emoji icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(0, 0, 0, 0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', flexShrink: 0,
      }}>
        {emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {participants.map((p, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
            }}>
              <Avatar email={p.email} size="xs" />
              {p.label}
            </span>
          ))}
          {statusBadges}
        </div>
      </div>

      {/* Amount + date + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatAmount(amount)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {formatDate(date)}
          </div>
        </div>
        <ChevronRight size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Filtros */}
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterDropdown
            id="cat-filter-btn"
            items={availableCatItems}
            activeKey={filterCategory}
            onSelect={setFilterCategory}
            icon={<Tag size={14} />} label="Categoría"
          />
          <FilterDropdown
            id="date-filter-btn"
            items={datePresetItems}
            activeKey={datePreset}
            onSelect={setDatePreset}
            icon={<CalendarDays size={14} />} label="Fecha"
          />
        </div>
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input id="date-from-input" className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ flex: 1 }} />
            <span className="text-xs text-muted">–</span>
            <input id="date-to-input" className="input" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} style={{ flex: 1 }} />
          </div>
        )}
      </div>

      {/* Lista */}
      {filteredGrouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Sin resultados</div>
          <div className="empty-state-text">No hay gastos con los filtros seleccionados</div>
          <button
            onClick={() => { setFilterCategory('all'); setDatePreset('all'); }}
            style={{
              marginTop: 12, padding: '8px 16px', borderRadius: 10,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}>
          {filteredGrouped.map((item, idx) => {
            const isLast = idx === filteredGrouped.length - 1;

            if (item.type === 'single') {
              const exp = item.expense;
              const debtInfo = pendingDebtByExpenseId[exp.expense_id];
              const expSettled = settlements[exp.expense_id]?.settled;

              const participants = [{ email: exp.paid_by, label: `${dn(exp.paid_by)} · ${formatAmount(exp.amount)}` }];

              let statusBadges = null;
              if (debtInfo) {
                statusBadges = debtInfo.debts.map((d, i) => (
                  <StatusBadge key={i} type="pending" text={`${dn(d.debtor)} debe ${formatAmount(d.amount)}`} />
                ));
              } else if (expSettled) {
                const debtors = (exp.participants || []).filter(p => p.user_email !== exp.paid_by && parseFloat(p.share_amount) > 0);
                statusBadges = debtors.length > 0
                  ? debtors.map((d, i) => <StatusBadge key={i} type="settled" text={`${dn(d.user_email)} saldó ${formatAmount(d.share_amount)}`} />)
                  : <StatusBadge type="settled" text="Saldado" />;
              }

              return (
                <div key={exp.expense_id} style={{ borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <ExpenseRow
                    emoji={getEmoji(exp.category, exp.description)}
                    title={exp.description || 'Sin descripción'}
                    amount={exp.amount}
                    date={exp.date}
                    participants={participants}
                    onClick={() => onExpenseClick(item)}
                    onEdit={() => onEditExpense(exp)}
                    statusBadges={statusBadges}
                  />
                </div>
              );
            }

            // Sesión (múltiples pagadores)
            const { sessionId, expenses: subExps, total, description, date } = item;
            const participants = subExps.map(sub => ({ email: sub.paid_by, label: `${dn(sub.paid_by)} · ${formatAmount(sub.amount)}` }));

            return (
              <div key={sessionId} style={{ borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <ExpenseRow
                  emoji={getCategoryEmoji(description)}
                  title={description || 'Sin descripción'}
                  amount={total}
                  date={date}
                  participants={participants}
                  onClick={() => onExpenseClick(item)}
                  onEdit={() => onEditSession(item)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
