// src/hooks/useExpenseFilters.js
import { useState, useMemo } from 'react';
import { getCategoryEmoji } from '../utils/categories';
import { DATE_PRESETS, getDateRange } from '../utils/datePresets';
import { formatDate, formatMonth } from '../utils/balanceCalculator';

function groupBySession(exps) {
  const result = [], seen = new Set();
  for (const exp of exps) {
    const sid = exp.session_id;
    if (!sid || sid === '') {
      result.push({ type: 'single', expense: exp });
    } else if (!seen.has(sid)) {
      seen.add(sid);
      const subs  = exps.filter((e) => e.session_id === sid);
      const total = subs.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      result.push({ type: 'session', sessionId: sid, expenses: subs, total, description: subs[0].description, date: subs[0].date });
    }
  }
  return result;
}

export function useExpenseFilters(allExpenses) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [datePreset,     setDatePreset]     = useState('month');
  const [customFrom,     setCustomFrom]     = useState('');
  const [customTo,       setCustomTo]       = useState('');

  const getCategoryKey = (exp) => (exp.category || 'otros').trim().toLowerCase();

  const activeDateRange = useMemo(
    () => getDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );

  const filteredRawExpenses = useMemo(() => {
    return allExpenses.filter((exp) => {
      if (filterCategory !== 'all' && getCategoryKey(exp) !== filterCategory) return false;
      const { from, to } = activeDateRange;
      const expDate = (exp.date || '').substring(0, 10);
      if (from && expDate < from) return false;
      if (to   && expDate > to)   return false;
      return true;
    });
  }, [allExpenses, filterCategory, activeDateRange]);

  const filteredGrouped = useMemo(() => groupBySession(filteredRawExpenses), [filteredRawExpenses]);

  const filteredTotal = useMemo(
    () => filteredRawExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    [filteredRawExpenses]
  );

  const availableCategories = useMemo(() => {
    const keys = new Set(allExpenses.map((e) => getCategoryKey(e)));
    return ['all', ...Array.from(keys)];
  }, [allExpenses]);

  const totalLabel = useMemo(() => {
    const catKey = filterCategory !== 'all' ? filterCategory : '';
    const catPart = catKey ? `· ${getCategoryEmoji(catKey)} ${catKey}` : '';
    if (datePreset === 'all')   return `Total general ${catPart}`;
    if (datePreset === 'week')  return `Esta semana ${catPart}`;
    if (datePreset === 'month') { const { from } = getDateRange('month'); return `${formatMonth(from)} ${catPart}`; }
    if (datePreset === 'last_month') { const { from } = getDateRange('last_month'); return `${formatMonth(from)} ${catPart}`; }
    if (datePreset === 'year')  return `Este año ${catPart}`;
    if (datePreset === 'custom' && customFrom && customTo) return `${formatDate(customFrom)} – ${formatDate(customTo)} ${catPart}`;
    return `Total ${catPart}`;
  }, [filterCategory, datePreset, customFrom, customTo]);

  return {
    filterCategory, setFilterCategory,
    datePreset, setDatePreset,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    filteredRawExpenses, filteredGrouped, filteredTotal,
    availableCategories, totalLabel, activeDateRange,
    getCategoryKey,
    DATE_PRESET_ITEMS: DATE_PRESETS.map(({ key, label }) => ({ key, emoji: '📅', label })),
  };
}
