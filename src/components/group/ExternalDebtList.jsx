// src/components/group/ExternalDebtList.jsx
// Cuaderno de deudas externas para grupos individuales (1 miembro).
// Los deudores son personas externas identificadas solo por nombre libre.
import { useState, useMemo } from 'react';
import { addExternalDebt, settleExternalDebt, unsettleExternalDebt, deleteExternalDebt } from '../../services/api';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { DebtStatusBadge } from '../ui/DebtStatusBadge';
import { CategoryPicker } from '../shared/CategoryPicker';
import { formatAmount } from '../../utils/balanceCalculator';
import { getUsedCategories } from '../../utils/categories';
import { getLocalDateString } from '../../utils/localDate';
import { Check, RotateCcw, Trash2, Plus, CircleCheck, BookOpen, X } from 'lucide-react';

// ── Formulario inline ─────────────────────────────────────────
function AddDebtForm({ groupId, userEmail, onSaved, onCancel }) {
  const toast = useToast();
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  const [debtorName, setDebtorName] = useState('');
  const [amount,     setAmount]     = useState('');
  const [description,setDescription]= useState('');
  const [category,   setCategory]   = useState('');
  const [date,       setDate]       = useState(getLocalDateString());
  const [saving,     setSaving]     = useState(false);

  const isValid = debtorName.trim() && parseFloat(amount) > 0 && date;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      await addExternalDebt({
        group_id:    groupId,
        created_by:  userEmail,
        debtor_name: debtorName,
        amount:      parseFloat(amount),
        description,
        category,
        date,
      });
      toast('Deuda registrada ✅');
      onSaved();
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 16, padding: 16,
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          Nueva deuda
        </span>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Nombre del deudor */}
        <div className="input-group">
          <label className="input-label">¿Quién te debe?</label>
          <input
            className="input"
            type="text"
            placeholder="Ej: Juan, mamá, cliente..."
            value={debtorName}
            onChange={e => setDebtorName(e.target.value)}
            autoFocus
            required
          />
        </div>

        {/* Monto */}
        <div className="input-group">
          <label className="input-label">Monto</label>
          <input
            className="input"
            type="number" min="0.01" step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onWheel={e => e.target.blur()}
            required
            style={{ fontWeight: 700, fontSize: '1.05rem' }}
          />
        </div>

        {/* Descripción */}
        <div className="input-group">
          <label className="input-label">Descripción (opcional)</label>
          <input
            className="input"
            type="text"
            placeholder="Ej: Cena del viernes"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Categoría */}
        <CategoryPicker
          category={category}
          setCategory={setCategory}
          usedCategories={usedCategories}
          datalistId="ext-debt-cat-suggestions"
        />

        {/* Fecha */}
        <div className="input-group">
          <label className="input-label">Fecha</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || !isValid}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none',
              background: (saving || !isValid) ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
              color: (saving || !isValid) ? 'var(--text-muted)' : '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}>
            {saving ? 'Guardando...' : 'Guardar deuda'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export function ExternalDebtList({ externalDebts, groupId, userEmail, onRefresh }) {
  const toast    = useToast();
  const [adding,          setAdding]          = useState(false);
  const [actioning,       setActioning]       = useState(null);
  const [confirmingDelete,setConfirmingDelete] = useState(null); // deuda completa a eliminar

  const pending = externalDebts.filter(d => d.status === 'pending');
  const settled = externalDebts.filter(d => d.status === 'settled');

  const handleSettle = async (id) => {
    setActioning(id);
    try {
      await settleExternalDebt(id);
      onRefresh();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    } finally {
      setActioning(null);
    }
  };

  const handleUnsettle = async (id) => {
    setActioning(id);
    try {
      await unsettleExternalDebt(id);
      onRefresh();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (debt) => {
    setActioning(debt.id);
    try {
      if (debt.expense_id) await deleteExpense(debt.expense_id).catch(() => {});
      await deleteExternalDebt(debt.id);
      setConfirmingDelete(null);
      onRefresh();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    } finally {
      setActioning(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
  };

  const DebtRow = ({ debt, isSettled }) => (
    <div style={{ opacity: isSettled ? 0.65 : 1 }}>
      {/* Fila principal */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
      }}>
        <Avatar name={debt.debtor_name} size="md" />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {debt.debtor_name}
            </span>
            <span style={{
              fontWeight: 800, fontSize: '0.9rem',
              color: isSettled ? 'var(--success)' : 'var(--danger)',
              flexShrink: 0,
            }}>
              {formatAmount(debt.amount)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
            {debt.category && <span>{debt.category}</span>}
            {debt.description && <span>· {debt.description}</span>}
            <span>· {formatDate(debt.date)}</span>
            {isSettled && (
              <DebtStatusBadge status="settled" />
            )}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!isSettled ? (
            <button
              onClick={() => handleSettle(debt.id)}
              disabled={actioning === debt.id}
              title="Marcar como cobrado"
              style={{
                padding: '6px 10px', borderRadius: 8, border: 'none',
                background: 'var(--text-primary)', color: '#fff',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                opacity: actioning === debt.id ? 0.5 : 1,
              }}>
              <Check size={12} /> Cobrado
            </button>
          ) : (
            <button
              onClick={() => handleUnsettle(debt.id)}
              disabled={actioning === debt.id}
              title="Reactivar"
              style={{
                background: 'none', border: '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 3,
                opacity: actioning === debt.id ? 0.5 : 1,
              }}>
              <RotateCcw size={11} /> Reactivar
            </button>
          )}
          <button
            onClick={() => setConfirmingDelete(debt)}
            disabled={actioning === debt.id}
            title="Eliminar"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: 8,
              color: 'var(--text-muted)', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Botón agregar — siempre arriba, igual que en grupos compartidos */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            border: '2px dashed rgba(0,0,0,0.12)', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Plus size={22} strokeWidth={2} />
        </button>
      )}

      {/* Formulario inline */}
      {adding && (
        <AddDebtForm
          groupId={groupId}
          userEmail={userEmail}
          onSaved={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Estado vacío */}
      {externalDebts.length === 0 && !adding && (
        <div className="empty-state" style={{ paddingTop: 16 }}>
          <div className="empty-state-icon"><BookOpen size={44} strokeWidth={1.5} /></div>
          <div className="empty-state-title">Cuaderno de deudas</div>
          <div className="empty-state-text">
            Anota quién te debe dinero. Solo escribe su nombre y el monto — no necesitan cuenta en la app.
          </div>
        </div>
      )}

      {/* Pendientes */}
      {pending.length > 0 && (
        <>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4,
          }}>
            Pendientes · {pending.length}
          </div>
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: 'var(--bg-card)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            {pending.map((d, idx) => (
              <div key={d.id} style={{ borderBottom: idx < pending.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <DebtRow debt={d} isSettled={false} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cobradas */}
      {settled.length > 0 && (
        <>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CircleCheck size={12} /> Cobradas · {settled.length}
          </div>
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: 'var(--bg-card)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            {settled.map((d, idx) => (
              <div key={d.id} style={{ borderBottom: idx < settled.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <DebtRow debt={d} isSettled={true} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={!!confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0 4px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255, 59, 48, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={24} color="var(--danger)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 6px' }}>
              ¿Eliminar esta deuda?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              "{confirmingDelete?.debtor_name}" por {formatAmount(confirmingDelete?.amount ?? 0)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
            <button
              onClick={() => setConfirmingDelete(null)}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(confirmingDelete)}
              disabled={!!actioning}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                background: 'var(--danger)', color: '#fff',
                fontSize: '0.9rem', fontWeight: 700,
                cursor: actioning ? 'wait' : 'pointer',
                opacity: actioning ? 0.6 : 1,
              }}>
              {actioning ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
