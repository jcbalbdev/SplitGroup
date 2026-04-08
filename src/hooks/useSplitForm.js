// src/hooks/useSplitForm.js
// Hook compartido que encapsula toda la lógica de estado de split/pagadores.
// Usado por ExpenseForm y BudgetItemForm para eliminar ~60 líneas de duplicación.
import { useState, useEffect } from 'react';

const SPLIT_MODES = { AMOUNT: 'amount', PERCENT: 'percent' };

export function useSplitForm(members, totalAmount, initialValues = {}) {
  const [paidBy,           setPaidBy]           = useState(initialValues.paidBy ?? '');
  const [participants,     setParticipants]     = useState(initialValues.participants ?? []);
  const [payers,           setPayers]           = useState([]);
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [splitMode,        setSplitMode]        = useState(SPLIT_MODES.AMOUNT);

  // Inicializar cuando members carga
  useEffect(() => {
    if (members.length > 0) {
      const emails = members.map(m => m.user_email || m.email);
      if (participants.length === 0) {
        setParticipants(emails.map(e => ({ email: e, value: '', selected: true })));
      }
      if (!paidBy) setPaidBy(emails[0]);
      if (payers.length === 0) {
        setPayers(emails.map(e => ({ email: e, amount: '' })));
      }
    }
  }, [members]);

  // Derivados
  const selectedParticipants = participants.filter(p => p.selected);
  const totalAssigned        = selectedParticipants.reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
  const payersTotal          = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitDiff            = splitMode === SPLIT_MODES.AMOUNT ? totalAmount - totalAssigned : 100 - totalAssigned;
  const payersDiff           = totalAmount - payersTotal;

  // Auto-split equitativo cuando cambia el monto o participantes seleccionados
  useEffect(() => {
    if (totalAmount > 0 && selectedParticipants.length > 0 && splitMode === SPLIT_MODES.AMOUNT) {
      const share = (totalAmount / selectedParticipants.length).toFixed(2);
      setParticipants(prev => prev.map(p => p.selected ? { ...p, value: share } : { ...p, value: '' }));
    }
  }, [totalAmount, selectedParticipants.length]);

  // Helpers
  const toggleParticipant = (email) =>
    setParticipants(prev => prev.map(p => p.email === email ? { ...p, selected: !p.selected, value: '' } : p));

  const updateValue = (email, val) =>
    setParticipants(prev => prev.map(p => p.email === email ? { ...p, value: val } : p));

  const splitEqually = () => {
    if (!selectedParticipants.length || !totalAmount) return;
    const share = (totalAmount / selectedParticipants.length).toFixed(2);
    setParticipants(prev => prev.map(p => p.selected ? { ...p, value: share } : p));
  };

  // Validación
  const isSplitValid = (requireDescription = false, description = '') => {
    if (!totalAmount) return false;
    if (requireDescription && !description?.trim()) return false;
    if (isMultiplePayers) {
      return Math.abs(payersDiff) < 0.05 && payers.some(p => parseFloat(p.amount) > 0);
    }
    if (!paidBy || !selectedParticipants.length) return false;
    return splitMode === SPLIT_MODES.AMOUNT
      ? Math.abs(splitDiff) < 0.05
      : Math.abs(totalAssigned - 100) < 0.5;
  };

  // Construir participantes finales para submit
  const buildFinalData = () => {
    const finalPaidBy = isMultiplePayers ? 'multiple' : paidBy;

    const finalParticipants = isMultiplePayers
      ? payers.filter(p => parseFloat(p.amount) > 0).map(p => ({
          user_email:   p.email,
          share_amount: parseFloat(parseFloat(p.amount).toFixed(2)),
        }))
      : participants.filter(p => p.selected).map(p => ({
          user_email:   p.email,
          share_amount: parseFloat(
            splitMode === SPLIT_MODES.PERCENT
              ? ((parseFloat(p.value) / 100) * totalAmount).toFixed(2)
              : parseFloat(p.value).toFixed(2)
          ),
        }));

    return { finalPaidBy, finalParticipants };
  };

  return {
    paidBy, setPaidBy,
    participants, setParticipants,
    payers, setPayers,
    isMultiplePayers, setIsMultiplePayers,
    splitMode, setSplitMode,
    selectedParticipants, totalAssigned,
    payersTotal, payersDiff, splitDiff,
    toggleParticipant, updateValue, splitEqually,
    isSplitValid, buildFinalData,
  };
}

export { SPLIT_MODES };
