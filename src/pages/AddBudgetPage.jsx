// src/pages/AddBudgetPage.jsx
// Guardado progresivo:
//   1. Usuario escribe nombre + fecha
//   2. Al agregar el primer item → crea el budget en DB automáticamente
//   3. Cada item se guarda en DB al instante → no hay pérdida de datos
//   4. El botón "← Atrás" es suficiente para terminar (budget ya existe)

import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createBudget, addBudgetItem, deleteBudgetItem } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { BudgetItemForm } from '../components/group/BudgetItemForm';
import { useGroupData } from '../hooks/useGroupData';
import { Plus, Trash2, CircleCheck } from 'lucide-react';
import { formatAmount } from '../utils/balanceCalculator';
import { getCategoryEmoji } from '../utils/categories';
import { PayerSummary } from '../components/shared/PayerSummary';
import { useNicknames } from '../context/NicknamesContext';
import { HelpTooltip } from '../components/ui/HelpTooltip';



export default function AddBudgetPage() {
  const { groupId } = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const toast       = useToast();
  const { members } = useGroupData(groupId, user?.email);
  const { dn } = useNicknames();
  const nameRef     = useRef(null);

  const [name,        setName]        = useState('');
  const [targetDate,  setTargetDate]  = useState('');
  const [budgetId,    setBudgetId]    = useState(null);   // ID ya creado en DB
  const [savedItems,  setSavedItems]  = useState([]);     // items guardados en DB
  const [addingItem,  setAddingItem]  = useState(false);
  const [savingItem,  setSavingItem]  = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);

  const totalAmount = savedItems.reduce((s, i) => s + parseFloat(i.amount), 0);

  // ── Agregar item ──────────────────────────────────────────────
  const handleAddItem = async (itemData) => {
    // Validar nombre antes de guardar
    if (!name.trim()) {
      toast('Escribe el nombre del presupuesto primero', 'error');
      nameRef.current?.focus();
      return;
    }

    setSavingItem(true);
    try {
      // Crear el budget en DB la primera vez
      let bid = budgetId;
      if (!bid) {
        const { budget } = await createBudget({
          group_id:    groupId,
          name:        name.trim(),
          target_date: targetDate || null,
          created_by:  user.email,
        });
        bid = budget.budget_id;
        setBudgetId(bid);
      }

      // Guardar item inmediatamente en DB
      const { item } = await addBudgetItem({ budget_id: bid, ...itemData });
      setSavedItems(prev => [...prev, { ...itemData, item_id: item.item_id }]);
      setAddingItem(false);
      toast('Item agregado');
    } catch (err) {
      console.error('[AddBudgetPage] Error al guardar item:', err);
      const msg = err?.message || String(err) || 'Error al guardar item';
      // Si el error menciona que la tabla no existe, dar mensaje útil
      const isTableMissing = msg.includes('does not exist') || msg.includes('relation');
      toast(
        isTableMissing
          ? 'Las tablas de presupuestos no existen aún. Ejecuta supabase_budgets.sql en Supabase primero.'
          : msg,
        'error'
      );
    } finally {
      setSavingItem(false);
    }
  };

  // ── Eliminar item ─────────────────────────────────────────────
  const handleRemoveItem = async (idx) => {
    const item = savedItems[idx];
    if (!item?.item_id) {
      setSavedItems(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setDeletingIdx(idx);
    try {
      await deleteBudgetItem(item.item_id);
      setSavedItems(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      toast(err.message || 'Error al eliminar item', 'error');
    } finally {
      setDeletingIdx(null);
    }
  };

  // ── Volver ────────────────────────────────────────────────────
  const handleBack = () => {
    // El budget ya está en DB si se guardó algún item.
    // Si no se guardó nada aún, simplemente volvemos.
    navigate(`/group/${groupId}`, { state: { activeTab: 'budgets' } });
  };

  return (
    <div className="page">
      <div style={{
        padding: '16px 16px 0', maxWidth: 480, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Nuevo presupuesto</h1>
          <HelpTooltip
            text="Crea un presupuesto para una meta o evento. Agrega ítems con su costo estimado y lleva el control del total en tiempo real."
            position="bottom"
          />
        </div>
        <button
          onClick={handleBack}
          style={{
            background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 10,
            padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        >
          ← Volver
        </button>
      </div>

      <div className="page-content">
        <div className="container" style={{ paddingBottom: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Nombre + Fecha */}
            <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Nombre del presupuesto *</label>
                <input
                  ref={nameRef}
                  id="budget-name-input"
                  className="input"
                  placeholder="ej: Viaje a Churín"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!!budgetId}   // Bloquear si ya se creó en DB
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Fecha objetivo (opcional)</label>
                <input
                  id="budget-date-input"
                  className="input"
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  disabled={!!budgetId}   // Bloquear si ya se creó en DB
                />
              </div>

              {/* Indicador de guardado */}
              {budgetId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontSize: '0.8rem' }}>
                  <CircleCheck size={14} />
                  Presupuesto creado — agrega los items que quieras
                </div>
              )}
            </div>

            {/* Items guardados */}
            {savedItems.length > 0 && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Items · {savedItems.length}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                    Total: {formatAmount(totalAmount)}
                  </span>
                </div>
                <div className="list">
                  {savedItems.map((item, idx) => (
                    <div key={item.item_id || idx} className="list-item" style={{ gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="list-item-title">
                          {getCategoryEmoji(item.category)} {item.description}
                        </div>
                        <div className="list-item-subtitle">
                          {formatAmount(item.amount)}
                          {' · '}
                          <PayerSummary
                            paidBy={item.paid_by}
                            participants={item.participants || []}
                            dn={dn}
                          />
                        </div>
                      </div>
                      <button type="button" className="btn btn-ghost btn-icon"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={deletingIdx === idx}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario inline para agregar item */}
            {addingItem ? (
              <div className="card animate-fade-in">
                <div style={{ fontWeight: 600, marginBottom: 14, fontSize: '0.95rem' }}>Nuevo item</div>
                <BudgetItemForm
                  groupId={groupId}
                  members={members}
                  submitLabel="Agregar item"
                  submitting={savingItem}
                  onSubmit={handleAddItem}
                  onCancel={() => setAddingItem(false)}
                />
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => setAddingItem(true)}>
                <Plus size={16} /> Agregar item
              </button>
            )}

            {/* Botón "Listo" — solo visible cuando hay items y no se está añadiendo */}
            {savedItems.length > 0 && !addingItem && (
              <button
                id="done-budget-btn"
                type="button"
                className="btn btn-primary btn-full animate-fade-in"
                onClick={handleBack}>
                Listo · {formatAmount(totalAmount)} guardado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
