// src/pages/EditExpensePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroupDetails, getExpenses, updateExpense, deleteExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ExpenseForm } from '../components/expense/ExpenseForm';
import { saveUsedCategory } from '../utils/categories';
import { clearCached } from '../utils/cache';
import { Trash2, Check } from 'lucide-react';

export default function EditExpensePage() {
  const { groupId, expenseId } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const toast     = useToast();

  const [members,       setMembers]       = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [detailRes, expenseRes] = await Promise.all([
          getGroupDetails(groupId),
          getExpenses(groupId),
        ]);
        const memberList = detailRes.members || [];
        setMembers(memberList);

        const exp = (expenseRes.expenses || []).find((e) => e.expense_id === expenseId);
        if (!exp) {
          toast('Gasto no encontrado', 'error');
          navigate(`/group/${groupId}`);
          return;
        }

        const emails = memberList.map((m) => m.user_email || m.email);
        const existingParts = exp.participants || [];

        setInitialValues({
          amount:       String(exp.amount),
          paidBy:       exp.paid_by,
          description:  exp.description || '',
          category:     exp.category || '',
          date:         exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
          participants: emails.map((email) => {
            const found = existingParts.find((p) => p.user_email === email);
            return { email, value: found ? String(found.share_amount) : '', selected: !!found };
          }),
          payers: emails.map((e) => ({ email: e, amount: '' })),
        });
      } catch (err) {
        toast('Error cargando datos', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, expenseId]);

  const handleSubmit = async ({ amount, paidBy, description, category, date, participants, splitMode }) => {
    setSubmitting(true);
    try {
      const PERCENT = 'percent';
      const parts = participants
        .filter((p) => p.selected)
        .map((p) => ({
          user_email:   p.email,
          share_amount: splitMode === PERCENT
            ? ((parseFloat(p.value) / 100) * amount).toFixed(2)
            : parseFloat(p.value),
        }));

      const label = description || category || 'Gasto';
      await updateExpense({
        expense_id:  expenseId,
        group_id:    groupId,
        amount,
        paid_by:     paidBy,
        description: label,
        category:    category || 'otros',
        date,
        participants: parts,
      });

      if (category) saveUsedCategory(groupId, category);
      clearCached(`group_${groupId}`);
      toast('Gasto actualizado ✅');
      navigate(`/group/${groupId}`);
    } catch (err) {
      toast(err.message || 'Error al actualizar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteExpense(expenseId, groupId);
      clearCached(`group_${groupId}`);
      toast('Gasto eliminado');
      navigate(`/group/${groupId}`);
    } catch (err) {
      toast(err.message || 'Error al eliminar', 'error');
    } finally {
      setSubmitting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Editar gasto"
        onBack={() => navigate(`/group/${groupId}`)}
        action={
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Eliminar
          </button>
        }
      />
      <div className="page-content">
        <div className="container">
          {initialValues && (
            <ExpenseForm
              loading={loading}
              members={members}
              initialValues={initialValues}
              submitLabel="Guardar cambios"
              onSubmit={handleSubmit}
              submitting={submitting}
              allowMultiPayer={false}
            />
          )}
          {loading && !initialValues && <div style={{ height: 400 }} />}
        </div>
      </div>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar gasto" centered>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            ¿Estás seguro que deseas eliminar este gasto?<br />
            <strong style={{ color: 'var(--danger)' }}>Esta acción no se puede deshacer.</strong>
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
            <button
              id="confirm-delete-btn"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Eliminando…' : <><Trash2 size={14} /> Eliminar</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
