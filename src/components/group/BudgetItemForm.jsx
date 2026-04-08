// src/components/group/BudgetItemForm.jsx
// Formulario de item de presupuesto — estilo idéntico al ExpenseForm (widget + pills).
// Sin campo de fecha (la toma el presupuesto).

import { useState, useMemo } from 'react';
import { CategoryPicker } from '../shared/CategoryPicker';
import { PayerSection } from '../shared/PayerSection';
import { SplitSection } from '../shared/SplitSection';
import { useSplitForm } from '../../hooks/useSplitForm';
import { getUsedCategories, getCategoryEmoji } from '../../utils/categories';
import { useNicknames } from '../../context/NicknamesContext';
import { formatAmount } from '../../utils/balanceCalculator';

export function BudgetItemForm({
  groupId,
  members = [],
  initialValues = {},
  submitLabel = 'Guardar item',
  onSubmit,
  submitting = false,
  onCancel,
}) {
  const { dn } = useNicknames();
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  const [description, setDescription] = useState(initialValues.description ?? '');
  const [amount,      setAmount]      = useState(initialValues.amount ?? '');
  const [category,    setCategory]    = useState(initialValues.category ?? '');

  const totalAmount = parseFloat(amount) || 0;
  const split = useSplitForm(members, totalAmount, initialValues);

  const isValid = () => split.isSplitValid(true, description);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid() || submitting) return;
    const { finalPaidBy, finalParticipants } = split.buildFinalData();
    onSubmit({
      description:  description.trim(),
      amount:       totalAmount,
      paid_by:      finalPaidBy,
      category:     category || 'otros',
      participants: finalParticipants,
    });
  };

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Widget grande con monto ── */}
      <div style={{ padding: '16px 0 4px' }}>
        <div style={{
          fontWeight: 900, fontSize: 'clamp(2rem, 10vw, 3.2rem)',
          letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10,
          color: totalAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>
          {totalAmount > 0 ? formatAmount(totalAmount) : 'S/. 0.00'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {category && <TagPill>{getCategoryEmoji(category)} {category}</TagPill>}
          {!category && <TagPill>Gasto futuro</TagPill>}
        </div>
      </div>

      {/* ── Formulario: Monto, Descripción, Categoría ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="input-group">
          <label className="input-label">Monto *</label>
          <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
            value={amount} onChange={e => setAmount(e.target.value)} required
            onWheel={e => e.target.blur()} />
        </div>

        <div className="input-group">
          <label className="input-label">Descripción *</label>
          <input className="input" placeholder="ej: Pasajes, Almuerzo..." value={description}
            onChange={e => setDescription(e.target.value)} required />
        </div>

        <CategoryPicker
          category={category}
          setCategory={setCategory}
          usedCategories={usedCategories}
          datalistId="budget-item-category-suggestions"
        />
      </div>

      {/* ¿Quién paga? */}
      <PayerSection
        members={members}
        paidBy={split.paidBy} setPaidBy={split.setPaidBy}
        isMultiplePayers={split.isMultiplePayers} setIsMultiplePayers={split.setIsMultiplePayers}
        payers={split.payers} setPayers={split.setPayers}
        payersDiff={split.payersDiff} payersTotal={split.payersTotal} totalAmount={totalAmount}
        dn={dn}
      />

      {/* División de gastos */}
      {!split.isMultiplePayers && (
        <SplitSection
          participants={split.participants}
          splitMode={split.splitMode} setSplitMode={split.setSplitMode}
          totalAmount={totalAmount} splitDiff={split.splitDiff}
          toggleParticipant={split.toggleParticipant}
          updateValue={split.updateValue}
          splitEqually={split.splitEqually}
          dn={dn}
        />
      )}

      {/* ── Acciones ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer',
            }}>
            Cancelar
          </button>
        )}
        <button type="submit"
          disabled={!isValid() || submitting}
          style={{
            flex: 2, padding: '12px', borderRadius: 12,
            border: 'none',
            background: (!isValid() || submitting) ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
            color: (!isValid() || submitting) ? 'var(--text-muted)' : '#fff',
            fontSize: '0.85rem', fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
          }}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
