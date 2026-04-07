// src/pages/AddExpensePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroupDetails, addExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { PageHeader } from '../components/ui/PageHeader';
import { ExpenseForm } from '../components/expense/ExpenseForm';
import { formatAmount } from '../utils/balanceCalculator';
import { saveUsedCategory } from '../utils/categories';
import { getLocalDateString } from '../utils/localDate';

export default function AddExpensePage() {
  const { groupId } = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const toast       = useToast();

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

  const handleSubmit = async ({ amount, paidBy, description, category, date, participants, payers, isMultiplePayers, splitMode }) => {
    setSubmitting(true);
    try {
      const label = description || category || 'Gasto';
      // Guardar categoría para sugerencias futuras
      if (category) saveUsedCategory(groupId, category);

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
            date,
            session_id:   sessionId,
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
        await addExpense({ group_id: groupId, amount, paid_by: paidBy, description: label, date, participants: parts });
        toast('Gasto agregado 🎉');
      }
      navigate(`/group/${groupId}`);
    } catch (err) {
      toast(err.message || 'Error al guardar el gasto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Nuevo gasto"
        onBack={() => navigate(`/group/${groupId}`)}
      />
      <div className="page-content">
        <div className="container">
          <ExpenseForm
            loading={loading}
            members={members}
            initialValues={initialValues}
            submitLabel="💾 Guardar gasto"
            onSubmit={handleSubmit}
            submitting={submitting}
            allowMultiPayer={true}
          />
        </div>
      </div>
    </div>
  );
}
