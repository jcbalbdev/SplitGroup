// src/components/expense/ExpenseForm.jsx
// Formulario de gasto reutilizado por AddExpensePage y EditExpensePage.
// Refactorizado: usa componentes compartidos y useSplitForm hook.

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FormSkeleton } from '../ui/FormSkeleton';
import { CategoryPicker } from '../shared/CategoryPicker';
import { PayerSection } from '../shared/PayerSection';
import { SplitSection } from '../shared/SplitSection';
import { useSplitForm } from '../../hooks/useSplitForm';
import { getUsedCategories } from '../../utils/categories';
import { useNicknames } from '../../context/NicknamesContext';
import { getLocalDateString } from '../../utils/localDate';

export function ExpenseForm({
  loading,
  members,
  initialValues = {},
  submitLabel = '💾 Guardar',
  onSubmit,
  submitting,
  allowMultiPayer = false,
}) {
  const { groupId } = useParams();
  const { dn } = useNicknames();
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  // ── Estado propio del formulario ──
  const [amount,      setAmount]      = useState(initialValues.amount ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [category,    setCategory]    = useState(initialValues.category ?? '');
  const [date,        setDate]        = useState(initialValues.date ?? getLocalDateString());

  const totalAmount = parseFloat(amount) || 0;

  // ── Hook de split (elimina ~60 líneas de estado duplicado) ──
  const split = useSplitForm(members, totalAmount, initialValues);

  // ── Validación ──
  const isValid = () => {
    if (!totalAmount || !date) return false;
    return split.isSplitValid();
  };

  // ── Submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid()) return;
    onSubmit({
      amount: totalAmount,
      paidBy: split.paidBy,
      description, category, date,
      participants: split.participants,
      payers: split.payers,
      isMultiplePayers: split.isMultiplePayers,
      splitMode: split.splitMode,
    });
  };

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

      {/* ── Monto ── */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="input-label" style={{ marginBottom: 8 }}>Monto total</div>
        <input
          id="expense-amount-input"
          onWheel={(e) => e.target.blur()}
          type="number" min="0.01" step="0.01"
          className="input"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{
            fontSize: '2.2rem', fontWeight: 800, textAlign: 'center',
            background: 'transparent', border: 'none',
            borderBottom: '2px solid var(--border)', borderRadius: 0,
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
          }}
        />
        <div className="text-xs text-muted" style={{ marginTop: 6 }}>S/. Soles peruanos</div>
      </div>

      {/* ── Descripción / Categoría / Fecha ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="input-group">
          <label className="input-label" htmlFor="expense-desc">Descripción</label>
          <input
            id="expense-desc" className="input" type="text"
            placeholder="Ej: Cena del viernes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <CategoryPicker
          category={category}
          setCategory={setCategory}
          usedCategories={usedCategories}
          datalistId="category-suggestions"
        />

        <div className="input-group">
          <label className="input-label" htmlFor="expense-date">Fecha</label>
          <input
            id="expense-date" className="input" type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* ── ¿Quién pagó? ── */}
      <PayerSection
        members={members}
        paidBy={split.paidBy} setPaidBy={split.setPaidBy}
        isMultiplePayers={split.isMultiplePayers} setIsMultiplePayers={split.setIsMultiplePayers}
        payers={split.payers} setPayers={split.setPayers}
        payersDiff={split.payersDiff} payersTotal={split.payersTotal} totalAmount={totalAmount}
        dn={dn}
        allowMultiPayer={allowMultiPayer}
      />

      {/* ── División de gastos (solo en modo un pagador) ── */}
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

      {/* ── Guardar ── */}
      <button
        id="save-expense-btn" type="submit"
        className="btn btn-primary btn-full"
        disabled={submitting || !isValid()}
        style={{ marginBottom: 16 }}
      >
        {submitting ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
