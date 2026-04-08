// src/components/group/BudgetDetailModal.jsx
// Modal de detalle de un presupuesto — estilo iOS minimalista
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { PayerSummary } from '../shared/PayerSummary';
import { BudgetItemForm } from './BudgetItemForm';
import { useToast } from '../ui/Toast';
import { formatAmount } from '../../utils/balanceCalculator';
import { useNicknames } from '../../context/NicknamesContext';
import { getCategoryEmoji } from '../../utils/categories';
import { executeItem, executeAllItems, cancelBudgetItem, deleteBudgetItem, addBudgetItem, updateBudgetItem, deleteBudget } from '../../services/api';
import { CircleCheck, Clock, X, Play, PlaySquare, Plus, Pencil, Trash2, ExternalLink, Calendar } from 'lucide-react';

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

  const RadioBtn = ({ selected, children, onClick }) => (
    <button type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 12, textAlign: 'left',
        border: `1.5px solid ${selected ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'}`,
        background: selected ? 'rgba(0,0,0,0.03)' : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit', width: '100%',
      }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: `2px solid ${selected ? 'var(--text-primary)' : 'rgba(0,0,0,0.15)'}`,
        background: selected ? 'var(--text-primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
      </div>
      <div>{children}</div>
    </button>
  );

  return (
    <div style={{
      marginTop: 10, padding: '14px', borderRadius: 14,
      background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Calendar size={14} color="var(--text-secondary)" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          ¿Cuándo realizaste este gasto?
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <RadioBtn selected={!useOtherDate} onClick={() => setUseOtherDate(false)}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {budgetDateFormatted ? `Sí, el ${budgetDateFormatted}` : 'Sí, en la fecha del presupuesto'}
          </div>
          {!budgetDate && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>El presupuesto no tiene fecha — se usará hoy</div>
          )}
        </RadioBtn>
        <RadioBtn selected={useOtherDate} onClick={() => setUseOtherDate(true)}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            No, fue en otra fecha
          </div>
        </RadioBtn>
        {useOtherDate && (
          <input type="date" className="input"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{ marginTop: 2 }}
            autoFocus
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onCancel}
          style={{
            flex: 1, padding: '10px', borderRadius: 12,
            border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
            color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600,
            cursor: 'pointer',
          }}>
          Cancelar
        </button>
        <button type="button"
          disabled={loading || (useOtherDate && !customDate)}
          onClick={handleConfirm}
          style={{
            flex: 2, padding: '10px', borderRadius: 12,
            border: 'none', background: 'var(--text-primary)', color: '#fff',
            fontSize: '0.82rem', fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: (loading || (useOtherDate && !customDate)) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
          {loading ? 'Registrando...' : <><Play size={12} /> Registrar gasto</>}
        </button>
      </div>
    </div>
  );
}

export function BudgetDetailModal({ budget, groupId, members, isOpen, onClose, onRefresh }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const { dn }   = useNicknames();

  const [confirmingItem, setConfirmingItem] = useState(null);
  const [executing,      setExecuting]      = useState(null);
  const [editingItem,    setEditingItem]    = useState(null);
  const [addingItem,     setAddingItem]     = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  if (!budget) return null;

  const allItems    = budget.budget_items || [];
  const items       = allItems.filter(i => i.status !== 'cancelled');
  const totalAmount = items.reduce((s, i) => s + parseFloat(i.amount), 0);
  const execAmount  = items.filter(i => i.status === 'executed').reduce((s, i) => s + parseFloat(i.amount), 0);
  const pendingItems= items.filter(i => i.status === 'pending');
  const progress    = totalAmount > 0 ? (execAmount / totalAmount) * 100 : 0;

  const doExecute = async (item, date) => {
    setExecuting(item.item_id);
    try {
      await executeItem(item.item_id, groupId, date);
      setConfirmingItem(null);
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error al registrar gasto', 'error');
    } finally {
      setExecuting(null);
    }
  };

  const handleExecuteAll = async () => {
    if (!confirm(`¿Registrar los ${pendingItems.length} items pendientes como gastos reales?`)) return;
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

  const handleDeleteItem = async (item) => {
    if (!confirm(`¿Eliminar "${item.description}"?`)) return;
    try {
      await deleteBudgetItem(item.item_id);
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error al eliminar', 'error');
    }
  };

  const handleDeleteBudget = async () => {
    setDeleting(true);
    try {
      await deleteBudget(budget.budget_id);
      toast('Presupuesto eliminado');
      onRefresh();
    } catch (err) {
      toast(err?.message || 'Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSaveEdit = async (data) => {
    setSaving(true);
    try {
      await updateBudgetItem(editingItem.item_id, { ...data, participants: data.participants });
      setEditingItem(null);
      onRefresh();
    } catch (err) {
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
      toast(err?.message || 'Error al agregar item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} fullscreen>
      {/* Custom header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, paddingBottom: 12,
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {budget.name}
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8, color: 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            aria-label="Eliminar presupuesto"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Confirmación de eliminación del presupuesto */}
      {confirmDelete ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          padding: '24px 0',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(255, 59, 48, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={22} color="var(--danger)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
              ¿Eliminar este presupuesto?
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              "{budget.name}" con {items.length} item{items.length !== 1 ? 's' : ''} — {formatAmount(totalAmount)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button onClick={handleDeleteBudget} disabled={deleting}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: 'none', background: 'var(--danger)', color: '#fff',
                fontSize: '0.85rem', fontWeight: 600,
                cursor: deleting ? 'wait' : 'pointer',
                opacity: deleting ? 0.6 : 1,
              }}>
              {deleting ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Progreso */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.03)', borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ejecutado</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {formatAmount(execAmount)} / {formatAmount(totalAmount)}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--success)' : 'var(--text-primary)', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            {budget.target_date && (
              <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} />
                Fecha objetivo: {new Date(budget.target_date + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          {/* Ejecutar todos */}
          {pendingItems.length > 1 && (
            <button onClick={handleExecuteAll} disabled={!!executing}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: 'none', background: 'var(--text-primary)', color: '#fff',
                fontSize: '0.85rem', fontWeight: 600, cursor: !!executing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: executing ? 0.6 : 1,
              }}>
              {executing === 'all' ? 'Registrando...' : <><PlaySquare size={15} /> Registrar todos ({pendingItems.length} items)</>}
            </button>
          )}

          {/* Lista de items — estilo iOS Settings */}
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: 'var(--bg-card)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}>
            {items.map((item, idx) => {
              const cfg          = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              const Icon         = cfg.icon;
              const isExec       = item.status === 'executed';
              const isPend       = item.status === 'pending';
              const isCancelled  = item.status === 'cancelled';
              const isEditingThis = editingItem?.item_id === item.item_id;
              const isConfirming  = confirmingItem === item.item_id;
              const isLast        = idx === items.length - 1;

              if (isEditingThis) {
                return (
                  <div key={item.item_id} style={{ padding: 16, borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
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
                  padding: '14px 16px',
                  opacity: isCancelled ? 0.5 : 1,
                  borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}>
                  {/* Row principal */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ paddingTop: 3, flexShrink: 0 }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontWeight: 600, fontSize: '0.88rem',
                          color: isCancelled ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}>
                          {getCategoryEmoji(item.category)} {item.description}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', flexShrink: 0 }}>
                          {formatAmount(item.amount)}
                        </span>
                      </div>
                      <PayerSummary paidBy={item.paid_by} participants={item.budget_item_participants || []} dn={dn} />
                      {isExec && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 6px', borderRadius: 6, marginTop: 4,
                          background: 'rgba(52, 199, 89, 0.08)',
                          fontSize: '0.65rem', fontWeight: 600, color: 'var(--success)',
                        }}>
                          ✓ Gasto registrado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirmación de fecha */}
                  {isConfirming && (
                    <ExecuteConfirm
                      item={item}
                      budgetDate={budget.target_date}
                      loading={executing === item.item_id}
                      onConfirm={(date) => doExecute(item, date)}
                      onCancel={() => setConfirmingItem(null)}
                    />
                  )}

                  {/* Botones de acción */}
                  {!isCancelled && !isConfirming && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {isPend && (
                        <>
                          <button onClick={() => setConfirmingItem(item.item_id)}
                            disabled={!!executing}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none',
                              background: 'var(--text-primary)', color: '#fff',
                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <Play size={11} /> Registrar gasto
                          </button>
                          <button onClick={() => setEditingItem(item)}
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                              color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <Pencil size={11} /> Editar
                          </button>
                          <button onClick={() => handleCancel(item)}
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                              color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(255,59,48,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}
                          >
                            <Trash2 size={11} /> Eliminar
                          </button>
                        </>
                      )}
                      {isExec && item.expense_id && (
                        <button onClick={() => { onClose(); navigate(`/group/${groupId}/edit-expense/${item.expense_id}`); }}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                            color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          <ExternalLink size={11} /> Ver gasto
                        </button>
                      )}
                      {!isPend && (
                        <button onClick={() => handleDeleteItem(item)}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1.5px solid rgba(255,59,48,0.15)', background: 'transparent',
                            color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          <Trash2 size={11} /> Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Agregar item (oculto durante edición) */}
          {!editingItem && (
            addingItem ? (
              <div style={{
                padding: 16, borderRadius: 16,
                background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Nuevo item</div>
                <BudgetItemForm
                  groupId={groupId} members={members}
                  submitLabel="Agregar" submitting={saving}
                  onSubmit={handleAddItem} onCancel={() => setAddingItem(false)}
                />
              </div>
            ) : (
              <button onClick={() => setAddingItem(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus size={15} /> Agregar item
              </button>
            )
          )}
        </div>
      )}
    </Modal>
  );
}
