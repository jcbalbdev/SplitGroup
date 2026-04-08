// src/components/group/BudgetList.jsx
// Tab de presupuestos — rediseñado estilo iOS minimalista
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BudgetDetailModal } from './BudgetDetailModal';
import { deleteBudget } from '../../services/api';
import { useToast } from '../ui/Toast';
import { formatAmount } from '../../utils/balanceCalculator';
import { BookMarked, ChevronRight } from 'lucide-react';

const STATUS_LABEL = {
  active:    { label: 'Activo',     color: 'var(--success)' },
  completed: { label: 'Completado', color: 'var(--text-muted)' },
  cancelled: { label: 'Cancelado',  color: 'var(--text-muted)' },
};

export function BudgetList({ budgets = [], groupId, members, onRefresh }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const [selected, setSelected] = useState(null);

  if (budgets.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="empty-state">
          <div className="empty-state-icon"><BookMarked size={44} strokeWidth={1.5} /></div>
          <div className="empty-state-title">Sin presupuestos</div>
          <div className="empty-state-text">Planifica gastos futuros y conviértelos en gastos reales</div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Lista estilo iOS Settings */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
      }}>
        {budgets.map((budget, idx) => {
          const allItems    = budget.budget_items || [];
          const items       = allItems.filter(i => i.status !== 'cancelled');
          const total       = items.reduce((s, i) => s + parseFloat(i.amount), 0);
          const executed    = items.filter(i => i.status === 'executed').reduce((s, i) => s + parseFloat(i.amount), 0);
          const pending     = items.filter(i => i.status === 'pending').length;
          const progress    = total > 0 ? Math.min((executed / total) * 100, 100) : 0;
          const statusCfg   = STATUS_LABEL[budget.status] || STATUS_LABEL.active;
          const isLast      = idx === budgets.length - 1;

          return (
            <div
              key={budget.budget_id}
              id={`budget-${budget.budget_id}`}
              onClick={() => setSelected(budget)}
              style={{
                padding: '14px 16px',
                cursor: 'pointer', transition: 'background 0.15s ease',
                borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Row principal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(0, 0, 0, 0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <BookMarked size={18} color="var(--text-secondary)" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {budget.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                      {pending > 0 && ` · ${pending} pendiente${pending !== 1 ? 's' : ''}`}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '1px 6px', borderRadius: 6,
                      background: budget.status === 'active' ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0,0,0,0.04)',
                      fontSize: '0.65rem', fontWeight: 600,
                      color: statusCfg.color,
                    }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Amount + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatAmount(total)}
                    </div>
                    {budget.target_date && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {new Date(budget.target_date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                </div>
              </div>

              {/* Barra de progreso */}
              {total > 0 && (
                <div style={{ marginTop: 8, paddingLeft: 52 }}>
                  <div style={{
                    height: 4, background: 'rgba(0, 0, 0, 0.04)',
                    borderRadius: 99, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: progress >= 100 ? 'var(--success)' : 'var(--text-primary)',
                      borderRadius: 99, transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: 4,
                    fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500,
                  }}>
                    <span>{formatAmount(executed)} ejecutado</span>
                    <span>{formatAmount(total - executed)} pendiente</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de detalle */}
      <BudgetDetailModal
        budget={selected}
        groupId={groupId}
        members={members}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={() => { onRefresh(); setSelected(null); }}
      />
    </div>
  );
}
