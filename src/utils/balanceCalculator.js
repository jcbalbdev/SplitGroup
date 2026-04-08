// src/utils/balanceCalculator.js
// ─────────────────────────────────────────────────────────────
// Calcula balances netos y deudas directas a partir de
// los gastos y participantes de un grupo.
// ─────────────────────────────────────────────────────────────

/**
 * @param {Array} expenses  - gastos del grupo
 * @param {Array} members   - emails de miembros
 * @returns {{ balances, debts }}
 */
export function calculateBalances(expenses, members) {
  // Balance neto por usuario: positivo = le deben, negativo = debe
  const balances = {};
  members.forEach((m) => (balances[m] = 0));

  // Deudas directas: { fromUser: { toUser: amount } }
  const debts = {};

  for (const expense of expenses) {
    const { paid_by, participants = [] } = expense;
    if (!paid_by) continue;

    for (const participant of participants) {
      const { user_email, share_amount } = participant;
      if (user_email === paid_by) continue; // quien pagó no se debe a sí mismo

      const amount = parseFloat(share_amount) || 0;
      if (amount <= 0) continue;

      // El pagador gana crédito
      balances[paid_by] = (balances[paid_by] || 0) + amount;
      // El participante pierde crédito
      balances[user_email] = (balances[user_email] || 0) - amount;

      // Registrar deuda directa
      if (!debts[user_email]) debts[user_email] = {};
      debts[user_email][paid_by] = (debts[user_email][paid_by] || 0) + amount;
    }
  }

  // Simplificar deudas mutuas (si A le debe a B y B le debe a A)
  const simplifiedDebts = [];
  const processed = new Set();

  for (const fromUser of Object.keys(debts)) {
    for (const toUser of Object.keys(debts[fromUser])) {
      const key = [fromUser, toUser].sort().join('|');
      if (processed.has(key)) continue;
      processed.add(key);

      const ab = debts[fromUser]?.[toUser] || 0;
      const ba = debts[toUser]?.[fromUser] || 0;
      const net = ab - ba;

      if (Math.abs(net) < 0.01) continue;

      simplifiedDebts.push(
        net > 0
          ? { from: fromUser, to: toUser, amount: net }
          : { from: toUser, to: fromUser, amount: Math.abs(net) }
      );
    }
  }

  return { balances, debts: simplifiedDebts };
}

/**
 * Genera deudas individuales por gasto (solo gastos de un solo pagador).
 * Las sesiones multi-payer NO generan deudas cruzadas por diseño.
 *
 * @param {Array} expenses - gastos crudos del grupo
 * @returns {Array<{expenseId, description, date, paidBy, debts: [{debtor, amount}]}>}
 */
export function computeExpenseDebts(expenses) {
  const result = [];

  for (const exp of expenses) {
    // Las sesiones (multi-pagador) no generan deuda cruzada
    if (exp.session_id && exp.session_id !== '') continue;

    const parts = exp.participants || [];
    const debtors = parts.filter(
      (p) => p.user_email !== exp.paid_by && (parseFloat(p.share_amount) || 0) > 0.009
    );

    if (!debtors.length) continue;

    result.push({
      expenseId:   exp.expense_id,
      description: exp.description || 'Sin descripción',
      date:        exp.date,
      paidBy:      exp.paid_by,
      debts:       debtors.map((p) => ({
        debtor: p.user_email,
        amount: parseFloat(p.share_amount) || 0,
      })),
    });
  }

  return result;
}

/**
 * Formatea un monto en moneda local
 */
export function formatAmount(amount, currency = 'S/.') {
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}

/**
 * Obtiene las iniciales de un email/nombre para el avatar
 */
export function getInitials(emailOrName = '') {
  const clean = emailOrName.split('@')[0];
  const parts = clean.split(/[.\-_]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Genera un color de avatar determinista basado en el email
 */
export function getAvatarGradient(email = '') {
  const hue = [...email].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 70%, 35%))`;
}

/** Formatea una fecha ISO como "06 abr" */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' }); }
  catch { return dateStr; }
}

/** Formatea una fecha ISO como "abril de 2026" */
export function formatMonth(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
}
