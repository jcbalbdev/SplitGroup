// src/components/expense/ExpenseForm.jsx
// Formulario de gasto reutilizado por AddExpensePage y EditExpensePage.

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { FormSkeleton } from '../ui/FormSkeleton';
import { getUsedCategories, getCategoryEmoji } from '../../utils/categories';
import { getNicknames, displayName } from '../../utils/nicknames';
import { formatAmount } from '../../utils/balanceCalculator';
import { getLocalDateString } from '../../utils/localDate';

const SPLIT_MODES = { AMOUNT: 'amount', PERCENT: 'percent' };

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
  const nicknames = useMemo(() => getNicknames(), []);
  const dn = (email) => displayName(email, nicknames);

  // Categorías usadas previamente en este grupo (sugerencias)
  const usedCategories = useMemo(() => getUsedCategories(groupId), [groupId]);

  // ── Estado del formulario ──────────────────────────────────
  const [amount,          setAmount]          = useState(initialValues.amount ?? '');
  const [paidBy,          setPaidBy]          = useState(initialValues.paidBy ?? '');
  const [description,     setDescription]     = useState(initialValues.description ?? '');
  const [category,        setCategory]        = useState(initialValues.category ?? '');
  const [date,            setDate]            = useState(initialValues.date ?? getLocalDateString());
  const [participants,    setParticipants]    = useState(initialValues.participants ?? []);
  const [payers,          setPayers]          = useState(initialValues.payers ?? []);
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [splitMode,       setSplitMode]       = useState(SPLIT_MODES.AMOUNT);

  // ── Sincronizar participantes cuando members carga ──
  useEffect(() => {
    if (members.length > 0 && participants.length === 0) {
      const emails = members.map((m) => m.user_email || m.email);
      setParticipants(emails.map((e) => ({ email: e, value: '', selected: true })));
      setPayers(emails.map((e) => ({ email: e, amount: '' })));
    }
  }, [members]);

  // Auto-dividir equitativamente cuando cambia el monto o los participantes seleccionados
  const totalAmount          = parseFloat(amount) || 0;
  const selectedParticipants = participants.filter((p) => p.selected);

  useEffect(() => {
    if (totalAmount > 0 && selectedParticipants.length > 0) {
      const share = (totalAmount / selectedParticipants.length).toFixed(2);
      setParticipants((prev) =>
        prev.map((p) => (p.selected ? { ...p, value: share } : { ...p, value: '' }))
      );
    }
  }, [totalAmount, selectedParticipants.length]);

  // ── Derivados ──────────────────────────────────────────────
  const totalAssigned = selectedParticipants.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
  const payersTotal   = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitDiff     = splitMode === SPLIT_MODES.AMOUNT ? totalAmount - totalAssigned : 100 - totalAssigned;
  const payersDiff    = totalAmount - payersTotal;

  // ── Helpers ────────────────────────────────────────────────
  const toggleParticipant = (email) =>
    setParticipants((prev) =>
      prev.map((p) => (p.email === email ? { ...p, selected: !p.selected, value: '' } : p))
    );

  const updateValue = (email, val) =>
    setParticipants((prev) =>
      prev.map((p) => (p.email === email ? { ...p, value: val } : p))
    );

  const splitEqually = () => {
    if (!selectedParticipants.length || !totalAmount) return;
    const share = (totalAmount / selectedParticipants.length).toFixed(2);
    setParticipants((prev) => prev.map((p) => (p.selected ? { ...p, value: share } : p)));
  };

  // ── Validación ─────────────────────────────────────────────
  const isValid = () => {
    if (!totalAmount || !date) return false;
    if (isMultiplePayers) {
      return Math.abs(payersDiff) < 0.05 && payers.some((p) => parseFloat(p.amount) > 0);
    }
    if (!paidBy || !selectedParticipants.length) return false;
    return splitMode === SPLIT_MODES.AMOUNT
      ? Math.abs(splitDiff) < 0.05
      : Math.abs(totalAssigned - 100) < 0.5;
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid()) return;
    onSubmit({ amount: totalAmount, paidBy, description, category, date, participants, payers, isMultiplePayers, splitMode });
  };

  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">

      {/* ── Monto ── */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="input-label" style={{ marginBottom: 8 }}>Monto total</div>
        <input
          id="expense-amount-input"
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

        <div className="input-group">
          <label className="input-label">Categoría</label>

          {/* Sugerencias de categorías usadas previamente */}
          {usedCategories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {usedCategories.map((cat) => {
                const active = category.toLowerCase() === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(active ? '' : cat)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 'var(--radius-full)',
                      background: active ? 'var(--primary)' : 'var(--bg-hover)',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      color: active ? '#fff' : 'var(--text-secondary)',
                      fontWeight: active ? 700 : 400, fontSize: '0.8rem',
                      cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {getCategoryEmoji(cat)} {cat}
                  </button>
                );
              })}
            </div>
          )}

          <input
            id="category-input"
            className="input" type="text"
            placeholder="Escribe la categoría (ej: Gym, Mascota, Comida...)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {usedCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>

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
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="input-label">¿Quién pagó?</div>
          {allowMultiPayer && (
            <div className="tabs" style={{ width: 'auto', gap: 2, padding: 3 }}>
              <div
                className={`tab ${!isMultiplePayers ? 'active' : ''}`}
                onClick={() => setIsMultiplePayers(false)}
                style={{ padding: '5px 14px', fontSize: '0.75rem' }}
              >Un pagador</div>
              <div
                className={`tab ${isMultiplePayers ? 'active' : ''}`}
                onClick={() => setIsMultiplePayers(true)}
                style={{ padding: '5px 14px', fontSize: '0.75rem' }}
              >Múltiples</div>
            </div>
          )}
        </div>

        {!isMultiplePayers ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => {
              const email = m.user_email || m.email;
              const sel = paidBy === email;
              return (
                <button
                  key={email} type="button"
                  id={`paid-by-${email.split('@')[0]}`}
                  onClick={() => setPaidBy(email)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 'var(--radius-full)',
                    background: sel ? 'var(--primary)' : 'var(--bg-hover)',
                    border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    color: sel ? '#fff' : 'var(--text-secondary)',
                    font: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  <Avatar email={email} size="sm" />
                  {dn(email)}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
              Ingresa cuánto pagó cada uno. Los montos deben sumar el total.
            </p>
            {payers.map((p) => (
              <div key={p.email} className="participant-row">
                <Avatar email={p.email} size="sm" />
                <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {dn(p.email)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>S/.</span>
                  <input
                    className="input" type="number" min="0" step="0.01"
                    placeholder="0.00" value={p.amount}
                    onChange={(e) =>
                      setPayers((prev) =>
                        prev.map((x) => (x.email === p.email ? { ...x, amount: e.target.value } : x))
                      )
                    }
                    style={{ maxWidth: 90, textAlign: 'right' }}
                  />
                </div>
              </div>
            ))}
            {payersTotal > 0 && totalAmount > 0 && (
              <SumIndicator ok={Math.abs(payersDiff) < 0.05} diff={payersDiff} total={totalAmount} mode="amount" />
            )}
          </div>
        )}
      </div>

      {/* ── División de gastos (solo en modo un pagador) ── */}
      {!isMultiplePayers && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="input-label">División de gastos</div>
            <div className="tabs" style={{ width: 'auto', gap: 2, padding: 3 }}>
              <div
                id="split-mode-amount"
                className={`tab ${splitMode === SPLIT_MODES.AMOUNT ? 'active' : ''}`}
                onClick={() => setSplitMode(SPLIT_MODES.AMOUNT)}
                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
              >S/.</div>
              <div
                id="split-mode-percent"
                className={`tab ${splitMode === SPLIT_MODES.PERCENT ? 'active' : ''}`}
                onClick={() => setSplitMode(SPLIT_MODES.PERCENT)}
                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
              >%</div>
            </div>
          </div>

          {totalAmount > 0 && (
            <button
              type="button" id="split-equally-btn"
              className="btn btn-secondary btn-sm"
              onClick={splitEqually}
              style={{ marginBottom: 12, width: '100%' }}
            >
              ⚡ Dividir equitativamente
            </button>
          )}

          {participants.map((p) => (
            <div key={p.email} className="participant-row">
              <input
                type="checkbox"
                id={`participant-check-${p.email}`}
                checked={p.selected}
                onChange={() => toggleParticipant(p.email)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <Avatar email={p.email} size="sm" />
              <span style={{
                flex: 1, fontSize: '0.85rem', fontWeight: 500,
                color: p.selected ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {dn(p.email)}
              </span>
              {p.selected && (
                <input
                  id={`participant-value-${p.email.split('@')[0]}`}
                  className="input" type="number" min="0" step="0.01"
                  max={splitMode === SPLIT_MODES.PERCENT ? 100 : undefined}
                  placeholder={splitMode === SPLIT_MODES.PERCENT ? '0' : '0.00'}
                  value={p.value}
                  onChange={(e) => updateValue(p.email, e.target.value)}
                  style={{ maxWidth: 90, textAlign: 'right' }}
                />
              )}
            </div>
          ))}

          {selectedParticipants.length > 0 && totalAmount > 0 && (
            <SumIndicator ok={Math.abs(splitDiff) < 0.05} diff={splitDiff} total={totalAmount} mode={splitMode} />
          )}
        </div>
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

// ── Sub-componente: indicador de suma ──────────────────────────
function SumIndicator({ ok, diff, total, mode }) {
  return (
    <div style={{
      marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: ok ? 'var(--success-soft)' : 'var(--danger-soft)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        {ok ? '✅ Sumas correctas' : 'Sin asignar'}
      </span>
      <span className={`font-bold text-sm ${ok ? 'text-success' : 'text-danger'}`}>
        {mode === 'percent'
          ? ok ? '100%' : `${diff.toFixed(1)}%`
          : ok ? formatAmount(total) : formatAmount(diff)}
      </span>
    </div>
  );
}
