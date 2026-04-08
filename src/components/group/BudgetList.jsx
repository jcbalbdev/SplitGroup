// src/components/group/BudgetList.jsx
// Tab de presupuestos: listado de tarjetas + acciones
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BudgetDetailModal } from './BudgetDetailModal';
import { deleteBudget } from '../../services/api';
import { useToast } from '../ui/Toast';
import { formatAmount } from '../../utils/balanceCalculator';
import { BookMarked, Plus, Trash2, CircleCheck, Clock } from 'lucide-react';

const STATUS_LABEL = {
  active:    { label: 'Activo',     color: 'var(--primary)' },
  completed: { label: 'Completado', color: 'var(--success)' },
  cancelled: { label: 'Cancelado',  color: 'var(--text-muted)' },
};

export function BudgetList({ budgets = [], groupId, members, onRefresh }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (e, budget) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar presupuesto "${budget.name}"?`)) return;
    setDeleting(budget.budget_id);
    try {
      await deleteBudget(budget.budget_id);
      onRefresh();
    } catch (err) {
      console.error('[deleteBudget] error:', err);
      toast(err?.message || 'Error al eliminar presupuesto', 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (budgets.length === 0) {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button id="add-budget-btn" className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => navigate(`/group/${groupId}/add-budget`)}>
            <Plus size={14} /> Presupuesto
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon"><BookMarked size={44} strokeWidth={1.5} /></div>
          <div className="empty-state-title">Sin presupuestos</div>
          <div className="empty-state-text">Planifica gastos futuros y conviértelos en gastos reales</div>
          <button className="btn btn-primary" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate(`/group/${groupId}/add-budget`)}>
            <Plus size={16} /> Crear presupuesto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {budgets.length} presupuesto{budgets.length !== 1 ? 's' : ''}
        </span>
        <button id="add-budget-btn" className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => navigate(`/group/${groupId}/add-budget`)}>
          <Plus size={14} /> Presupuesto
        </button>
      </div>

      {/* Tarjetas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {budgets.map((budget) => {
          const allItems    = budget.budget_items || [];
          const items       = allItems.filter(i => i.status !== 'cancelled');
          const total       = items.reduce((s, i) => s + parseFloat(i.amount), 0);
          const executed    = items.filter(i => i.status === 'executed').reduce((s, i) => s + parseFloat(i.amount), 0);
          const pending     = items.filter(i => i.status === 'pending').length;
          const progress    = total > 0 ? (executed / total) * 100 : 0;
          const statusCfg   = STATUS_LABEL[budget.status] || STATUS_LABEL.active;

          return (
            <div
              key={budget.budget_id}
              id={`budget-${budget.budget_id}`}
              className="list-item card-interactive"
              style={{ flexDirection: 'column', gap: 10, paddingBottom: 14, cursor: 'pointer' }}
              onClick={() => setSelected(budget)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(budget)}
            >
              {/* Fila superior */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,92,252,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookMarked size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {budget.name}
                  </div>
                  <div className="list-item-subtitle">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                    {pending > 0 && ` · ${pending} pendiente${pending !== 1 ? 's' : ''}`}
                    {budget.target_date && ` · ${new Date(budget.target_date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatAmount(total)}</div>
                    <div style={{ fontSize: '0.7rem', color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    title="Eliminar presupuesto"
                    disabled={deleting === budget.budget_id}
                    onClick={(e) => handleDelete(e, budget)}
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              {total > 0 && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CircleCheck size={11} /> {formatAmount(executed)} ejecutado
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} /> {formatAmount(total - executed)} pendiente
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--success)' : 'var(--primary)', borderRadius: 99, transition: 'width 0.4s ease' }} />
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
