// src/components/group/BudgetDetailModal.jsx
// Modal de detalle de un presupuesto: muestra items, progreso y permite ejecutar/editar/cancelar.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { PayerSummary } from '../shared/PayerSummary';
import { BudgetItemForm } from './BudgetItemForm';
import { useToast } from '../ui/Toast';
import { formatAmount } from '../../utils/balanceCalculator';
import { displayName, getNicknames } from '../../utils/nicknames';
import { getCategoryEmoji } from '../../utils/categories';
import { executeItem, executeAllItems, cancelBudgetItem, deleteBudgetItem, addBudgetItem, updateBudgetItem } from '../../services/api';
import { CircleCheck, Clock, X, Play, PlaySquare, Plus, Pencil, Trash2, ExternalLink, Calendar } from 'lucide-react';

const nicknames = getNicknames();
const dn = (email) => displayName(email, nicknames);

const STATUS_CONFIG = {
  pending:  { icon: Clock,       color: 'var(--text-muted)', label: 'Pendiente' },
  executed: { icon: CircleCheck, color: 'var(--success)',    label: 'Ejecutado' },
  cancelled:{ icon: X,           color: 'var(--danger)',     label: 'Cancelado' },
};

// Componente inline para confirmar la fecha antes de ejecutar
function ExecuteConfirm({ item, budgetDate, onConfirm, onCancel, loading }) {
  const [useOtherDate, setUseOtherDate] = useState(false);
  const [customDate,   setCustomDate]   = useState('');

  const budgetDateFormatted = budgetDate
    ? new Date(budgetDate + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleConfirm = () => {
    if (useOtherDate && !customDate) return;
    onConfirm(useOtherDate ? customDate : (budgetDate || null));
  };

  return (
    <div style={{
      marginTop: 10, padding: '14px 14px 10px', borderRadius: 'var(--radius-lg)',
      background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Calendar size={14} color="var(--primary)" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          ¿Cuándo realizaste este gasto?
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {/* Opción 1: fecha del presupuesto */}
        <button type="button"
          onClick={() => setUseOtherDate(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 'var(--radius-md)', textAlign: 'left',
            border: `1.5px solid ${!useOtherDate ? 'var(--primary)' : 'var(--border)'}`,
            background: !useOtherDate ? 'rgba(124,92,252,0.1)' : 'var(--bg-hover)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${!useOtherDate ? 'var(--primary)' : 'var(--border)'}`, background: !useOtherDate ? 'var(--primary)' : 'transparent', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: !useOtherDate ? 'var(--primary)' : 'var(--text-primary)' }}>
              {budgetDateFormatted ? `Sí, el ${budgetDateFormatted}` : 'Sí, en la fecha del presupuesto'}
            </div>
            {!budgetDate && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>El presupuesto no tiene fecha — se usará hoy</div>
            )}
          </div>
        </button>

        {/* Opción 2: otra fecha */}
        <button type="button"
          onClick={() => setUseOtherDate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 'var(--radius-md)', textAlign: 'left',
            border: `1.5px solid ${useOtherDate ? 'var(--primary)' : 'var(--border)'}`,
            background: useOtherDate ? 'rgba(124,92,252,0.1)' : 'var(--bg-hover)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${useOtherDate ? 'var(--primary)' : 'var(--border)'}`, background: useOtherDate ? 'var(--primary)' : 'transparent', flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: useOtherDate ? 'var(--primary)' : 'var(--text-primary)' }}>
            No, fue en otra fecha
          </div>
        </button>

        {useOtherDate && (
          <input type="date" className="input"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{ marginTop: 2 }}
            autoFocus
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-success btn-sm"
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          disabled={loading || (useOtherDate && !customDate)}
          onClick={handleConfirm}>
          {loading ? 'Registrando...' : <><Play size={12} /> Registrar gasto</>}
        </button>
      </div>
    </div>
  );
}

export function BudgetDetailModal({ budget, groupId, members, isOpen, onClose, onRefresh }) {
  const navigate = useNavigate();
  const toast    = useToast();

  // item_id del item cuyo confirm de fecha está abierto
  const [confirmingItem, setConfirmingItem] = useState(null);
  const [executing,      setExecuting]      = useState(null);  // item_id | 'all'
  const [editingItem,    setEditingItem]    = useState(null);
  const [addingItem,     setAddingItem]     = useState(false);
  const [saving,         setSaving]         = useState(false);

  if (!budget) return null;

  const allItems    = budget.budget_items || [];
  const items        = allItems.filter(i => i.status !== 'cancelled');  // nunca mostrar cancelados
  const totalAmount  = items.reduce((s, i) => s + parseFloat(i.amount), 0);
  const execAmount   = items.filter(i => i.status === 'executed').reduce((s, i) => s + parseFloat(i.amount), 0);
  const pendingItems = items.filter(i => i.status === 'pending');
  const progress     = totalAmount > 0 ? (execAmount / totalAmount) * 100 : 0;

  // Llamado DESPUÉS de que el usuario confirma la fecha
  const doExecute = async (item, date) => {
    setExecuting(item.item_id);
    try {
      await executeItem(item.item_id, groupId, date);
      setConfirmingItem(null);
      onRefresh();
    } catch (err) {
      console.error('[executeItem] error:', err);
      toast(err?.message || 'Error al registrar gasto', 'error');
    } finally {
      setExecuting(null);
    }
  };

  const handleExecuteAll = async () => {
    if (!confirm(`¿Registrar los ${pendingItems.length} items pendientes como gastos reales? Todos usarán la fecha del presupuesto.`)) return;
    setExecuting('all');
    try {
      await executeAllItems(budget.budget_id, groupId);
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error', 'error');
    } finally {
      setExecuting(null);
    }
  };

  const handleCancel = async (item) => {
    if (!confirm(`¿Cancelar "${item.description}"?`)) return;
    try {
      await cancelBudgetItem(item.item_id);
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error al cancelar', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar "${item.description}"?`)) return;
    try {
      await deleteBudgetItem(item.item_id);
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error al eliminar', 'error');
    }
  };

  const handleSaveEdit = async (data) => {
    setSaving(true);
    try {
      await updateBudgetItem(editingItem.item_id, { ...data, participants: data.participants });
      setEditingItem(null);
      onRefresh();
    } catch (err) {
      console.error('[handleSaveEdit] error:', err);
      toast(err?.message || 'Error al editar item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (data) => {
    setSaving(true);
    try {
      await addBudgetItem({ budget_id: budget.budget_id, ...data });
      setAddingItem(false);
      onRefresh();
    } catch (err) {
      console.error('[handleAddItem] error:', err);
      toast(err?.message || 'Error al agregar item', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={budget.name} fullscreen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Progreso */}
        <div style={{ background: 'var(--bg-page)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="text-sm text-muted">Ejecutado</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
              {formatAmount(execAmount)} / {formatAmount(totalAmount)}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          {budget.target_date && (
            <div className="text-xs text-muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              Fecha objetivo: {new Date(budget.target_date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Botón ejecutar todos */}
        {pendingItems.length > 1 && (
          <button className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={handleExecuteAll}
            disabled={!!executing}>
            {executing === 'all' ? 'Ejecutando...' : <><PlaySquare size={15} /> Ejecutar todos ({pendingItems.length} items)</>}
          </button>
        )}

        {/* Lista de items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => {
            const cfg          = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const Icon         = cfg.icon;
            const isExec       = item.status === 'executed';
            const isPend       = item.status === 'pending';
            const isCancelled  = item.status === 'cancelled';
            const isEditingThis = editingItem?.item_id === item.item_id;
            const isConfirming  = confirmingItem === item.item_id;

            if (isEditingThis) {
              return (
                <div key={item.item_id} className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Editar: {item.description}</div>
                  <BudgetItemForm
                    groupId={groupId} members={members}
                    initialValues={{
                      description:  item.description,
                      amount:       item.amount,
                      paidBy:       item.paid_by,
                      category:     item.category,
                      participants: (item.budget_item_participants || []).map(p => ({ email: p.user_email, value: p.share_amount, selected: true })),
                    }}
                    submitLabel="Guardar cambios" submitting={saving}
                    onSubmit={handleSaveEdit} onCancel={() => setEditingItem(null)}
                  />
                </div>
              );
            }

            return (
              <div key={item.item_id} style={{
                background: isCancelled ? 'transparent' : 'var(--bg-card)',
                border: `1px solid ${isExec ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                opacity: isCancelled ? 0.5 : 1,
              }}>
                {/* Fila principal */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <Icon size={15} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isCancelled ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        {getCategoryEmoji(item.category)} {item.description}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                        {formatAmount(item.amount)}
                      </span>
                    </div>
                    <PayerSummary
                      paidBy={item.paid_by}
                      participants={item.budget_item_participants || []}
                      dn={dn}
                    />
                      {isExec && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, marginLeft: 4 }}>· Gasto registrado</span>}
                  </div>
                </div>

                {/* Confirmación de fecha (inline) */}
                {isConfirming && (
                  <ExecuteConfirm
                    item={item}
                    budgetDate={budget.target_date}
                    loading={executing === item.item_id}
                    onConfirm={(date) => doExecute(item, date)}
                    onCancel={() => setConfirmingItem(null)}
                  />
                )}

                {/* Botones de acción (solo si no está en modo confirmar) */}
                {!isCancelled && !isConfirming && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {isPend && (
                      <>
                        <button className="btn btn-success btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          disabled={!!executing}
                          onClick={() => setConfirmingItem(item.item_id)}>
                          <Play size={12} /> Ejecutar
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setEditingItem(item)}>
                          <Pencil size={12} /> Editar
                        </button>
                        <button className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleCancel(item)}>
                          <X size={12} /> Cancelar
                        </button>
                      </>
                    )}
                    {isExec && item.expense_id && (
                      <button className="btn btn-ghost btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}
                        onClick={() => { onClose(); navigate(`/group/${groupId}/edit-expense/${item.expense_id}`); }}>
                        <ExternalLink size={12} /> Ver gasto
                      </button>
                    )}
                    {!isPend && (
                      <button className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDelete(item)}>
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Agregar item inline */}
        {addingItem ? (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Nuevo item</div>
            <BudgetItemForm
              groupId={groupId} members={members}
              submitLabel="Agregar" submitting={saving}
              onSubmit={handleAddItem} onCancel={() => setAddingItem(false)}
            />
          </div>
        ) : (
          <button className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => setAddingItem(true)}>
            <Plus size={15} /> Agregar item
          </button>
        )}
      </div>
    </Modal>
  );
}
