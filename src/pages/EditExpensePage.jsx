// src/pages/EditExpensePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroupDetails, getExpenses, updateExpense, deleteExpense } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ExpenseForm } from '../components/expense/ExpenseForm';
import { CATEGORIES, detectCategory } from '../utils/categories';
import { getCategoryOverride, setCategoryOverride, clearCategoryOverride } from '../utils/categoryOverrides';

export default function EditExpensePage() {
  const { groupId, expenseId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const toast     = useToast();

  // Categorías visibles: solo las usadas en el grupo o todas
  const usedCategoryKeys   = location.state?.usedCategoryKeys || null;
  const visibleCategories  = useMemo(() => {
    if (!usedCategoryKeys) return CATEGORIES;
    return CATEGORIES.filter((cat) => usedCategoryKeys.includes(cat.key) || cat.key === 'otros');
  }, [usedCategoryKeys]);

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

        // Resolver categoría: backend > override local > auto-detección
        const override        = getCategoryOverride(exp.expense_id);
        const backendCategory = exp.category || '';
        let resolvedKey, resolvedCustom;

        if (backendCategory && CATEGORIES.some((c) => c.key === backendCategory)) {
          resolvedKey    = backendCategory;
          resolvedCustom = '';
        } else if (backendCategory) {
          resolvedKey    = 'otros';
          resolvedCustom = backendCategory;
        } else if (override) {
          resolvedKey    = CATEGORIES.some((c) => c.key === override.key) ? override.key : 'otros';
          resolvedCustom = override.key === 'otros' ? (override.label || '') : '';
        } else {
          const detected = detectCategory(exp.description || '');
          resolvedKey    = detected;
          resolvedCustom = '';
        }

        const emails = memberList.map((m) => m.user_email || m.email);
        const existingParts = exp.participants || [];

        setInitialValues({
          amount:         String(exp.amount),
          paidBy:         exp.paid_by,
          description:    exp.description || '',
          category:       resolvedKey,
          customCategory: resolvedCustom,
          date:           exp.date ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
          participants:   emails.map((email) => {
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

  const handleSubmit = async ({ amount, paidBy, description, category, customCategory, date, participants, splitMode }) => {
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

      await updateExpense({
        expense_id:  expenseId,
        group_id:    groupId,
        amount,
        paid_by:     paidBy,
        description: description || (category === 'otros' ? customCategory : category),
        category:    category === 'otros' ? (customCategory.trim() || 'otros') : category,
        date,
        participants: parts,
      });

      // Guardar override de categoría en localStorage para feedback inmediato
      if (category === 'otros') {
        const label = customCategory.trim();
        if (label) setCategoryOverride(expenseId, { key: 'otros', label, emoji: '💰' });
        else       clearCategoryOverride(expenseId);
      } else {
        const meta = CATEGORIES.find((c) => c.key === category);
        if (meta) setCategoryOverride(expenseId, { key: category, label: meta.label, emoji: meta.emoji });
        else      clearCategoryOverride(expenseId);
      }

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
            🗑️ Eliminar
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
              submitLabel="✅ Guardar cambios"
              onSubmit={handleSubmit}
              submitting={submitting}
              allowMultiPayer={false}
              visibleCategories={visibleCategories}
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
              {submitting ? 'Eliminando…' : '🗑️ Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
