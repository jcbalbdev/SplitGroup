// src/pages/AddExpensePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroupDetails, addExpense, addRecurringExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ExpenseForm } from '../components/expense/ExpenseForm';
import { formatAmount } from '../utils/balanceCalculator';
import { saveUsedCategory } from '../utils/categories';
import { getLocalDateString } from '../utils/localDate';
import { clearCached } from '../utils/cache';

export default function AddExpensePage() {
  const { groupId } = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const toast       = useToast();

  // Pre-seleccionar modo recurrente si viene desde la tab Recurrentes
  const initialRecurring = new URLSearchParams(location.search).get('recurring') === '1';
  // Modo deuda: un solo pagador, sin múltiples ni recurrente
  const isDebtMode       = new URLSearchParams(location.search).get('debt') === '1';

  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getGroupDetails(groupId);
        setMembers(res.members || []);
      } catch {
        toast('Error cargando miembros', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  // Valores iniciales del formulario
  const emails = members.map((m) => m.user_email || m.email);
  const initialValues = {
    amount:       '',
    paidBy:       user.email,
    description:  '',
    category:     '',
    date:         getLocalDateString(),
    participants: emails.map((e) => ({ email: e, value: '', selected: true })),
    payers:       emails.map((e) => ({ email: e, amount: '' })),
  };

  const handleSubmit = async ({ amount, paidBy, description, category, date, participants, payers, isMultiplePayers, splitMode, isRecurring, frequency, startDate }) => {
    setSubmitting(true);
    try {
      const label = description || category || 'Gasto';
      // Guardar categoría para sugerencias futuras
      if (category) saveUsedCategory(groupId, category);

      // ── Recurring: guardar como plantilla ──
      if (isRecurring) {
        const PERCENT = 'percent';
        const parts = participants
          .filter((p) => p.selected)
          .map((p) => ({
            user_email:   p.email,
            share_amount: splitMode === PERCENT
              ? ((parseFloat(p.value) / 100) * amount).toFixed(2)
              : parseFloat(p.value),
          }));
        await addRecurringExpense({
          group_id:    groupId,
          amount,
          description: label,
          category:    category || 'otros',
          paid_by:     paidBy,
          frequency:   frequency || 'monthly',
          start_date:  startDate || date,
          created_by:  user.email,
          participants: parts,
        });
        toast('Gasto recurrente creado 🔄');
        clearCached(`group_${groupId}`);
        navigate(`/group/${groupId}`, { state: { activeTab: 'recurring' } });
        return;
      }

      if (isMultiplePayers) {
        const sessionId   = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const activePayers = payers.filter((p) => parseFloat(p.amount) > 0);
        // Secuencial para evitar race condition en ensureSessionIdColumn del backend
        for (const payer of activePayers) {
          const paid = parseFloat(payer.amount);
          await addExpense({
            group_id:     groupId,
            amount:       paid,
            paid_by:      payer.email,
            description:  label,
            category:     category || 'otros',
            date,
            session_id:   sessionId,
            created_by:   user.email,
            participants: [{ user_email: payer.email, share_amount: paid }],
          });
        }
        toast('Gastos guardados 🎉');
      } else {
        const PERCENT = 'percent';
        const parts = participants
          .filter((p) => p.selected)
          .map((p) => ({
            user_email:   p.email,
            share_amount: splitMode === PERCENT
              ? ((parseFloat(p.value) / 100) * amount).toFixed(2)
              : parseFloat(p.value),
          }));
        await addExpense({ group_id: groupId, amount, paid_by: paidBy, description: label, category: category || 'otros', date, created_by: user.email, participants: parts });
        toast('Gasto agregado 🎉');
      }
      // Invalidar caché del grupo para que se muestren los gastos nuevos
      clearCached(`group_${groupId}`);
      navigate(`/group/${groupId}`, { state: { activeTab: isDebtMode ? 'balances' : 'expenses' } });
    } catch (err) {
      toast(err.message || 'Error al guardar el gasto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      {/* Header sutil */}
      <div style={{
        padding: '16px 16px 0', maxWidth: 480, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{
          fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em',
        }}>{isDebtMode ? 'Nueva deuda' : 'Nuevo gasto'}</h1>
        <button
          onClick={() => navigate(`/group/${groupId}`)}
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
        <div className="container">
          <ExpenseForm
            loading={loading}
            members={members}
            initialValues={initialValues}
            submitLabel={isDebtMode ? '💾 Guardar deuda' : '💾 Guardar gasto'}
            onSubmit={handleSubmit}
            submitting={submitting}
            allowMultiPayer={!isDebtMode}
            allowRecurring={!isDebtMode}
            initialRecurring={initialRecurring}
          />
        </div>
      </div>
    </div>
  );
}
