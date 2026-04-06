// src/components/group/BalanceWidget.jsx
import { formatAmount } from '../../utils/balanceCalculator';

export function BalanceWidget({ activeTab, totalPendingDebt, filteredPendingDebts, filteredTotal, filteredGrouped, totalLabel, membersCount }) {
  return (
    <div className="balance-widget animate-fade-in" style={{ marginBottom: 16 }}>
      {activeTab === 'balances' && (
        <>
          <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Deudas totales</div>
          <div className={`balance-amount ${totalPendingDebt > 0 ? 'amount-negative' : 'amount-neutral'}`}>{formatAmount(totalPendingDebt)}</div>
          <div className="text-sm text-muted">
            {filteredPendingDebts.length > 0 ? `${filteredPendingDebts.length} pendiente${filteredPendingDebts.length > 1 ? 's' : ''}` : 'Todo saldado 🎉'}
          </div>
        </>
      )}
      {activeTab === 'expenses' && (
        <>
          <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{totalLabel}</div>
          <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.02em', marginBottom: 4 }}>{formatAmount(filteredTotal)}</div>
          <div className="text-sm text-muted">{filteredGrouped.length} {filteredGrouped.length === 1 ? 'gasto' : 'gastos'}</div>
        </>
      )}
      {activeTab === 'members' && (
        <>
          <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Miembros del grupo</div>
          <div className="balance-amount amount-neutral">{membersCount}</div>
          <div className="text-sm text-muted">{membersCount === 1 ? 'persona en este grupo' : 'personas en este grupo'}</div>
        </>
      )}
    </div>
  );
}
