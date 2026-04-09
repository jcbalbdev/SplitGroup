// src/components/group/BalanceWidget.jsx
import { formatAmount } from '../../utils/balanceCalculator';

export function BalanceWidget({ activeTab, totalPendingDebt, filteredPendingDebts, filteredTotal, filteredGrouped, totalLabel, membersCount, budgets = [], recurringStats = null }) {

  const activeBudgets = budgets.filter(b => b.status === 'active');
  const budgetTotal = activeBudgets.reduce((sum, b) => {
    const items = (b.budget_items || []).filter(i => i.status !== 'cancelled');
    return sum + items.reduce((s, i) => s + parseFloat(i.amount), 0);
  }, 0);

  const TagPill = ({ children }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 20,
      background: 'rgba(0, 0, 0, 0.04)',
      color: 'var(--text-secondary)',
      fontSize: '0.75rem', fontWeight: 600,
    }}>{children}</span>
  );

  return (
    <div className="animate-fade-in" style={{
      marginBottom: 16, padding: '24px 0 8px',
    }}>
      {activeTab === 'balances' && (
        <>
          <div className={`${totalPendingDebt > 0 ? 'amount-negative' : ''}`} style={{
            fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
            color: totalPendingDebt > 0 ? 'var(--danger)' : 'var(--text-primary)',
          }}>{formatAmount(totalPendingDebt)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TagPill>Deudas totales</TagPill>
            <TagPill>
              {filteredPendingDebts.length > 0
                ? `${filteredPendingDebts.length} pendiente${filteredPendingDebts.length > 1 ? 's' : ''}`
                : 'Todo saldado 🎉'}
            </TagPill>
          </div>
        </>
      )}
      {activeTab === 'expenses' && (
        <>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
            color: 'var(--text-primary)',
          }}>{formatAmount(filteredTotal)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TagPill>{totalLabel}</TagPill>
            <TagPill>{filteredGrouped.length} {filteredGrouped.length === 1 ? 'gasto' : 'gastos'}</TagPill>
          </div>
        </>
      )}
      {activeTab === 'members' && (
        <>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
            color: 'var(--text-primary)',
          }}>{membersCount}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TagPill>Miembros del grupo</TagPill>
          </div>
        </>
      )}
      {activeTab === 'budgets' && (
        <>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
            color: 'var(--text-primary)',
          }}>{formatAmount(budgetTotal)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TagPill>Total general</TagPill>
            <TagPill>{activeBudgets.length} {activeBudgets.length === 1 ? 'presupuesto activo' : 'presupuestos activos'}</TagPill>
          </div>
        </>
      )}
      {activeTab === 'recurring' && recurringStats && (
        <>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
            color: recurringStats.total > 0 ? 'var(--primary)' : 'var(--text-muted)',
          }}>{formatAmount(recurringStats.total)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TagPill>{recurringStats.label}</TagPill>
            <TagPill>{recurringStats.occurrences} {recurringStats.occurrences === 1 ? 'registro' : 'registros'}</TagPill>
            {recurringStats.templateCount > 1 && (
              <TagPill>{recurringStats.templateCount} plantillas</TagPill>
            )}
          </div>
        </>
      )}
    </div>
  );
}
