// src/components/group/ExpenseList.jsx
import { Avatar } from '../ui/Avatar';
import { FilterDropdown } from '../ui/FilterDropdown';
import { formatAmount, formatDate } from '../../utils/balanceCalculator';
import { getCategoryEmojiFromDesc } from '../../utils/categories';

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
  getExpenseCategoryEmoji,
  dn,
}) {
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
            icon="🏷️" label="Categoría"
          />
          <FilterDropdown
            id="date-filter-btn"
            items={datePresetItems}
            activeKey={datePreset}
            onSelect={setDatePreset}
            icon="📅" label="Fecha"
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
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => { setFilterCategory('all'); setDatePreset('all'); }}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="list">
          {filteredGrouped.map((item) => {
            if (item.type === 'single') {
              const exp        = item.expense;
              const debtInfo   = pendingDebtByExpenseId[exp.expense_id];
              const expSettled = settlements[exp.expense_id]?.settled;

              return (
                <div key={exp.expense_id} className="list-item" onClick={() => onExpenseClick(item)}
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      {getExpenseCategoryEmoji(exp)}
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{exp.description || 'Sin descripción'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="font-bold text-sm">{formatAmount(exp.amount)}</div>
                        <div className="text-xs text-muted">{formatDate(exp.date)}</div>
                      </div>
                      <button className="btn btn-ghost btn-icon" title="Editar gasto"
                        onClick={(e) => { e.stopPropagation(); onEditExpense(exp); }}
                        style={{ color: 'var(--text-muted)', fontSize: '1rem', padding: '6px 8px' }}>✏️</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 52, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-hover)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Avatar email={exp.paid_by} size="xs" />
                      {dn(exp.paid_by)} · {formatAmount(exp.amount)}
                    </span>
                    {debtInfo && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>
                        ⚠️ {debtInfo.debts.map((d) => `${dn(d.debtor)} debe ${formatAmount(d.amount)}`).join(' · ')}
                      </span>
                    )}
                    {expSettled && !debtInfo && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                        ✅ Saldado
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Sesión (múltiples pagadores)
            const { sessionId, expenses: subExps, total, description, date } = item;
            return (
              <div key={sessionId} className="list-item" onClick={() => onExpenseClick(item)}
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    {getCategoryEmojiFromDesc(description)}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{description || 'Sin descripción'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-bold text-sm">{formatAmount(total)}</div>
                      <div className="text-xs text-muted">{formatDate(date)}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon" title="Editar gasto"
                      onClick={(e) => { e.stopPropagation(); onEditSession(item); }}
                      style={{ color: 'var(--text-muted)', fontSize: '1rem', padding: '6px 8px' }}>✏️</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 52 }}>
                  {subExps.map((sub) => (
                    <span key={sub.expense_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-hover)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Avatar email={sub.paid_by} size="xs" />
                      {dn(sub.paid_by)} · {formatAmount(sub.amount)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
