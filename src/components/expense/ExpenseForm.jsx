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
import { getUsedCategories, getCategoryEmoji } from '../../utils/categories';
import { useNicknames } from '../../context/NicknamesContext';
import { getLocalDateString } from '../../utils/localDate';
import { formatAmount } from '../../utils/balanceCalculator';

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

  // ── Helpers ──
  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
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

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

      {/* ── Widget grande con monto ── */}
      <div style={{ padding: '24px 0 8px' }}>
        <div style={{
          fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
          letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
          color: totalAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>
          {totalAmount > 0 ? formatAmount(totalAmount) : 'S/. 0.00'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {category && <TagPill>{getCategoryEmoji(category)} {category}</TagPill>}
          {date && <TagPill>{formatDate(date)}</TagPill>}
          {!category && !date && <TagPill>Nuevo gasto</TagPill>}
        </div>
      </div>

      {/* ── Formulario: Monto, Descripción, Categoría, Fecha ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="input-group">
          <label className="input-label" htmlFor="expense-amount-input">Monto total</label>
          <input
            id="expense-amount-input"
            onWheel={(e) => e.target.blur()}
            type="number" min="0.01" step="0.01"
            className="input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ fontWeight: 700, fontSize: '1.1rem' }}
          />
        </div>

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
        disabled={submitting || !isValid()}
        style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: 'none', cursor: 'pointer',
          background: submitting || !isValid() ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
          color: submitting || !isValid() ? 'var(--text-muted)' : '#fff',
          fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em',
          transition: 'all 0.2s ease',
          marginBottom: 16, marginTop: 4,
        }}
      >
        {submitting ? 'Guardando…' : 'Guardar gasto'}
      </button>
    </form>
  );
}
