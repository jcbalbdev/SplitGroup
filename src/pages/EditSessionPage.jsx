// src/pages/EditSessionPage.jsx
// Permite editar un gasto con múltiples pagadores (vinculados por session_id):
// - Descripción y fecha (campos comunes a todos los sub-gastos)
// - Cuánto pagó cada uno (actualiza el amount de cada sub-gasto)
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails, getExpenses, updateExpenseSession, deleteExpenseSession } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Avatar } from '../components/ui/Avatar';
import { formatAmount } from '../utils/balanceCalculator';
import { Modal } from '../components/ui/Modal';
import { useNicknames } from '../context/NicknamesContext';

function FormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-in">
      <div className="card skeleton" style={{ height: 110 }} />
      <div className="card skeleton" style={{ height: 140 }} />
      <div className="card skeleton" style={{ height: 120 }} />
    </div>
  );
}

export default function EditSessionPage() {
  const { groupId, sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { dn } = useNicknames();

  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [payers, setPayers] = useState([]); // [{ expenseId, email, amount }]

  useEffect(() => {
    const init = async () => {
      try {
        // Intentar usar los datos pasados por navegación (rápido)
        let subExps = location.state?.sessionExpenses;

        // Si no hay state, fetchear desde la API
        if (!subExps) {
          const res = await getExpenses(groupId);
          subExps = (res.expenses || []).filter((e) => e.session_id === sessionId);
        }

        if (!subExps || subExps.length === 0) {
          toast('Gasto no encontrado', 'error');
          navigate(`/group/${groupId}`);
          return;
        }

        setDescription(subExps[0].description || '');
        setDate(subExps[0].date ? subExps[0].date.split('T')[0] : '');
        setPayers(subExps.map((e) => ({
          expenseId: e.expense_id,
          email:     e.paid_by,
          amount:    String(e.amount),
        })));
      } catch {
        toast('Error cargando datos', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [groupId, sessionId]);

  const total = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const isValid = () => description.trim() !== '' && date !== '' && total > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateExpenseSession({
        session_id:  sessionId,
        group_id:    groupId,
        description: description.trim(),
        date,
        payers: payers.map((p) => ({
          expense_id: p.expenseId,
          amount:     parseFloat(p.amount) || 0,
        })),
      });
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
      await deleteExpenseSession(sessionId, groupId);
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
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/group/${groupId}`)} aria-label="Volver">
              ←
            </button>
            <div className="header-title">Editar gasto</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
            🗑️ Eliminar
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="container">
          {loading ? (
            <FormSkeleton />
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              className="animate-fade-in"
            >
              {/* Total (solo lectura, calculado de los pagadores) */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="input-label" style={{ marginBottom: 6 }}>Monto total</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {formatAmount(total)}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>S/. Soles peruanos · Gasto compartido</div>
              </div>

              {/* Descripción y fecha */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="edit-ses-desc">Descripción</label>
                  <input
                    id="edit-ses-desc"
                    className="input"
                    type="text"
                    placeholder="Ej: Cena del viernes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="edit-ses-date">Fecha</label>
                  <input
                    id="edit-ses-date"
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ¿Cuánto pagó cada uno? */}
              <div className="card">
                <div className="input-label" style={{ marginBottom: 12 }}>¿Cuánto pagó cada uno?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {payers.map((p) => (
                    <div key={p.expenseId} className="participant-row">
                      <Avatar email={p.email} size="sm" />
                      <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {p.email.split('@')[0]}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>S/.</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={p.amount}
                          onChange={(e) =>
                            setPayers((prev) =>
                              prev.map((x) => (x.expenseId === p.expenseId ? { ...x, amount: e.target.value } : x))
                            )
                          }
                          style={{ maxWidth: 90, textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                id="save-session-edit-btn"
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || !isValid()}
                style={{ marginBottom: 16 }}
              >
                {submitting ? 'Guardando…' : '✅ Guardar cambios'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal confirmar eliminación */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar gasto" centered>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            ¿Eliminar este gasto y todos sus pagadores?<br />
            <strong style={{ color: 'var(--danger)' }}>Esta acción no se puede deshacer.</strong>
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
            <button
              id="confirm-delete-session-btn"
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
