// src/components/group/BudgetItemForm.jsx
// Formulario de item de presupuesto.
// Refactorizado: usa componentes compartidos y useSplitForm hook.
// Sin campo de fecha (la toma el presupuesto).

import { useState, useMemo } from 'react';
import { CategoryPicker } from '../shared/CategoryPicker';
import { PayerSection } from '../shared/PayerSection';
import { SplitSection } from '../shared/SplitSection';
import { useSplitForm } from '../../hooks/useSplitForm';
import { getUsedCategories } from '../../utils/categories';
import { getNicknames, displayName } from '../../utils/nicknames';

export function BudgetItemForm({
  groupId,
  members = [],
  initialValues = {},
  submitLabel = 'Guardar item',
  onSubmit,
  submitting = false,
  onCancel,
}) {
  const nicknames = useMemo(() => getNicknames(), []);
  const dn = (email) => displayName(email, nicknames);
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  // ── Estado propio ──
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [amount,      setAmount]      = useState(initialValues.amount ?? '');
  const [category,    setCategory]    = useState(initialValues.category ?? '');

  const totalAmount = parseFloat(amount) || 0;

  // ── Hook de split ──
  const split = useSplitForm(members, totalAmount, initialValues);

  // ── Validación ──
  const isValid = () => split.isSplitValid(true, description);

  // ── Submit ──
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Descripción */}
      <div className="input-group">
        <label className="input-label">Descripción *</label>
        <input className="input" placeholder="ej: Pasajes" value={description}
          onChange={e => setDescription(e.target.value)} required />
      </div>

      {/* Monto */}
      <div className="input-group">
        <label className="input-label">Monto *</label>
        <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
          value={amount} onChange={e => setAmount(e.target.value)} required
          onWheel={e => e.target.blur()} />
      </div>

      {/* Categoría */}
      <CategoryPicker
        category={category}
        setCategory={setCategory}
        usedCategories={usedCategories}
        datalistId="budget-item-category-suggestions"
      />

      {/* ¿Quién paga? */}
      <PayerSection
        members={members}
        paidBy={split.paidBy} setPaidBy={split.setPaidBy}
        isMultiplePayers={split.isMultiplePayers} setIsMultiplePayers={split.setIsMultiplePayers}
        payers={split.payers} setPayers={split.setPayers}
        payersDiff={split.payersDiff} payersTotal={split.payersTotal} totalAmount={totalAmount}
        dn={dn}
      />

      {/* División de gastos (solo en modo un pagador) */}
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

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}
          disabled={!isValid() || submitting}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
