// src/components/expense/ExpenseForm.jsx
// Formulario de gasto reutilizado por AddExpensePage y EditExpensePage.
// Soporta toggle de gasto recurrente (allowRecurring prop).
// Refactorizado: usa componentes compartidos y useSplitForm hook.

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { FormSkeleton } from '../ui/FormSkeleton';
import { CategoryPicker } from '../shared/CategoryPicker';
import { PayerSection } from '../shared/PayerSection';
import { SplitSection } from '../shared/SplitSection';
import { useSplitForm } from '../../hooks/useSplitForm';
import { getUsedCategories, getCategoryEmoji } from '../../utils/categories';
import { useNicknames } from '../../context/NicknamesContext';
import { getLocalDateString } from '../../utils/localDate';
import { formatAmount } from '../../utils/balanceCalculator';

const FREQ_OPTIONS = [
  { key: 'weekly',   label: 'Semanal',   emoji: '📅' },
  { key: 'biweekly', label: 'Quincenal', emoji: '📅' },
  { key: 'monthly',  label: 'Mensual',   emoji: '🔄' },
];

export function ExpenseForm({
  loading,
  members,
  initialValues = {},
  submitLabel = '💾 Guardar',
  onSubmit,
  submitting,
  allowMultiPayer = false,
  allowRecurring = false,
  initialRecurring = false,
}) {
  const { groupId } = useParams();
  const { dn } = useNicknames();
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  // ── Estado propio del formulario ──
  const [amount,      setAmount]      = useState(initialValues.amount ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [category,    setCategory]    = useState(initialValues.category ?? '');
  const [date,        setDate]        = useState(initialValues.date ?? getLocalDateString());

  // ── Estado recurrente ──
  const [isRecurring, setIsRecurring] = useState(initialRecurring);
  const [frequency,   setFrequency]   = useState('monthly');
  const [startDate,   setStartDate]   = useState(initialValues.date ?? getLocalDateString());

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
      // Recurring fields
      isRecurring,
      frequency,
      startDate,
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
          {date && !isRecurring && <TagPill>{formatDate(date)}</TagPill>}
          {isRecurring && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 20,
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {FREQ_OPTIONS.find(f => f.key === frequency)?.label || 'Mensual'}
            </span>
          )}
          {!category && !date && !isRecurring && <TagPill>Nuevo gasto</TagPill>}
        </div>
      </div>

      {/* ── Formulario: Monto, Descripción, Categoría, Fecha ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="input-group">
          {/* Label + Segmented Control (Único / Recurrente) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="input-label" htmlFor="expense-amount-input" style={{ margin: 0 }}>Monto total</label>
            {allowRecurring && (
              <div style={{
                display: 'inline-flex', gap: 3,
                background: 'rgba(0, 0, 0, 0.04)', borderRadius: 10, padding: 3,
              }}>
                {[
                  { value: false, label: 'Único' },
                  { value: true,  label: 'Recurrente' },
                ].map(opt => {
                  const active = isRecurring === opt.value;
                  return (
                    <button key={String(opt.value)} type="button"
                      id={`expense-type-${opt.value ? 'recurring' : 'single'}`}
                      onClick={() => setIsRecurring(opt.value)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: active
                          ? (opt.value ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : '#fff')
                          : 'transparent',
                        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        color: active
                          ? (opt.value ? '#fff' : 'var(--text-primary)')
                          : 'var(--text-muted)',
                        fontSize: '0.75rem', fontWeight: active ? 700 : 500,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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

        {!isRecurring && (
          <div className="input-group">
            <label className="input-label" htmlFor="expense-date">Fecha</label>
            <input
              id="expense-date" className="input" type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        )}
      </div>
      {/* ── Tarjeta informativa recurrente + frecuencia ── */}
      {allowRecurring && isRecurring && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(255,107,53,0.05), rgba(255,140,90,0.05))',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,107,53,0.12)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Info card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Repeat size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{
                fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)',
                letterSpacing: '-0.01em',
              }}>
                Gasto recurrente
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.4 }}>
                El gasto se registrará automáticamente según la frecuencia elegida.
              </div>
            </div>
          </div>

          {/* Frecuencia */}
          <div className="input-group">
            <label className="input-label" htmlFor="recurring-freq">Frecuencia</label>
            <div style={{
              display: 'flex', gap: 4,
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 'var(--radius-md)',
              padding: 4,
            }}>
              {FREQ_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  id={`freq-${key}`}
                  onClick={() => setFrequency(key)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: frequency === key ? 700 : 500,
                    color: frequency === key ? 'var(--primary)' : 'var(--text-muted)',
                    background: frequency === key ? '#fff' : 'transparent',
                    border: frequency === key
                      ? '1.5px solid rgba(255,107,53,0.2)'
                      : '1.5px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: frequency === key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha de inicio */}
          <div className="input-group">
            <label className="input-label" htmlFor="recurring-start-date">Fecha de inicio</label>
            <input
              id="recurring-start-date" className="input" type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.7)' }}
            />
          </div>
        </div>
      )}

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
