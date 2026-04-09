// src/components/group/RecurringExpenseList.jsx
// Tab standalone de plantillas recurrentes.
// Lista de tarjetas → click abre modal de gestión (info + pausar / activar / eliminar).
import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { formatAmount } from '../../utils/balanceCalculator';
import { getCategoryEmoji } from '../../utils/categories';
import { useNicknames } from '../../context/NicknamesContext';
import { toggleRecurringExpense, deleteRecurringExpense } from '../../services/api';
import { useToast } from '../ui/Toast';
import { Repeat, Pause, Play, Trash2, Calendar, RefreshCw } from 'lucide-react';

const FREQ_LABELS = {
  weekly:   'Semanal',
  biweekly: 'Quincenal',
  monthly:  'Mensual',
};

const FREQ_DETAIL = {
  weekly:   'Se registra cada 7 días',
  biweekly: 'Se registra cada 14 días',
  monthly:  'Se registra el mismo día cada mes',
};

function formatDateLong(d) {
  if (!d) return '';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return d; }
}

function isDueOrPast(nextDueDate) {
  const today = new Date().toISOString().split('T')[0];
  return nextDueDate <= today;
}

export function RecurringExpenseList({
  recurring, groupId, onRefresh,
  allRecurringExpenses = [],
  filterById, setFilterById,
  dateFrom, setDateFrom,
  dateTo,   setDateTo,
}) {
  const toast = useToast();
  const { dn } = useNicknames();
  const [selected,      setSelected]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling,      setToggling]      = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const handleToggle = async () => {
    if (!selected) return;
    setToggling(true);
    try {
      await toggleRecurringExpense(selected.recurring_id, !selected.is_active);
      toast(selected.is_active ? 'Pausado ⏸️' : 'Reactivado ▶️');
      setSelected(null);
      onRefresh();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteRecurringExpense(selected.recurring_id);
      toast('Eliminado');
      setSelected(null);
      setConfirmDelete(false);
      onRefresh();
    } catch (err) {
      toast(err.message || 'Error al eliminar', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────
  if (!recurring || recurring.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: '48px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(255,107,53,0.1), rgba(255,140,90,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Repeat size={24} color="var(--primary)" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
            Sin gastos recurrentes
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Crea un gasto recurrente para que se registre<br />automáticamente según la frecuencia elegida.
          </div>
        </div>
      </div>
    );
  }

  // ── Filter bar ───────────────────────────────────────────────
  const hasFilters = setFilterById && setDateFrom && setDateTo;
  const hasDateFilter = dateFrom || dateTo;

  // ── Lista de plantillas ─────────────────────────────────────
  return (
    <>
      {/* Filtros */}
      {hasFilters && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {/* Selector por plantilla */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {/* Pill "Todas" */}
            <button
              onClick={() => setFilterById('all')}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                background: filterById === 'all' ? 'var(--text-primary)' : 'rgba(0,0,0,0.05)',
                color: filterById === 'all' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              Todas
            </button>
            {recurring.map(rec => (
              <button
                key={rec.recurring_id}
                onClick={() => setFilterById(rec.recurring_id)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none',
                  background: filterById === rec.recurring_id ? 'var(--primary)' : 'rgba(0,0,0,0.05)',
                  color: filterById === rec.recurring_id ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.2s ease',
                  maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {rec.description}
              </button>
            ))}
          </div>

          {/* Rango de fechas */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input"
              style={{ flex: 1, fontSize: '0.78rem', padding: '8px 10px' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input"
              style={{ flex: 1, fontSize: '0.78rem', padding: '8px 10px' }}
            />
            {hasDateFilter && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600,
                  flexShrink: 0, padding: '4px 6px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="animate-fade-in">
        {recurring.map((rec) => {
          const due   = rec.is_active && isDueOrPast(rec.next_due_date);
          const emoji = getCategoryEmoji(rec.category || rec.description);

          return (
            <button
              key={rec.recurring_id}
              onClick={() => setSelected(rec)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 16,
                background: 'var(--bg-card)',
                border: due
                  ? '1.5px solid rgba(255,107,53,0.18)'
                  : '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
                opacity: rec.is_active ? 1 : 0.55,
                transition: 'all 0.2s ease',
                boxShadow: due ? '0 2px 12px rgba(255,107,53,0.08)' : 'none',
              }}
            >
              {/* Icono / emoji */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: due
                  ? 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,140,90,0.12))'
                  : 'rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
                border: due ? '1.5px solid rgba(255,107,53,0.15)' : '1.5px solid transparent',
              }}>
                {emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
                }}>
                  <span style={{
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {rec.description}
                  </span>
                  {!rec.is_active && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 800,
                      background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)',
                      padding: '1px 6px', borderRadius: 6, flexShrink: 0,
                    }}>
                      PAUSADO
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    padding: '2px 7px', borderRadius: 6,
                    background: 'var(--primary-glow)', color: 'var(--primary)',
                  }}>
                    {FREQ_LABELS[rec.frequency] || rec.frequency}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {rec.is_active
                      ? (due ? '📌 Pendiente de registro' : `Próx. ${formatDateLong(rec.next_due_date)}`)
                      : 'Pausado manualmente'}
                  </span>
                </div>
              </div>

              {/* Monto */}
              <div style={{
                fontWeight: 800, fontSize: '0.95rem',
                color: 'var(--text-primary)', flexShrink: 0,
              }}>
                {formatAmount(rec.amount)}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Modal de gestión ──────────────────────────────────── */}
      <Modal isOpen={!!selected && !confirmDelete} onClose={() => setSelected(null)} centered>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Repeat size={22} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {selected.description}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Gasto recurrente · {selected.is_active ? 'Activo' : 'Pausado'}
                </div>
              </div>
            </div>

            {/* Info card */}
            <div style={{
              background: 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Monto */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {formatAmount(selected.amount)}
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }} />

              {/* Frecuencia */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frecuencia</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)',
                  }}>
                    {FREQ_LABELS[selected.frequency]}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {FREQ_DETAIL[selected.frequency]}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }} />

              {/* Próxima fecha */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo registro</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  <span style={{
                    fontWeight: 600, fontSize: '0.82rem',
                    color: isDueOrPast(selected.next_due_date) && selected.is_active
                      ? 'var(--primary)'
                      : 'var(--text-primary)',
                  }}>
                    {isDueOrPast(selected.next_due_date) && selected.is_active
                      ? 'Pendiente de registro'
                      : formatDateLong(selected.next_due_date)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }} />

              {/* Pagador */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paga</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar email={selected.paid_by} size="xs" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {dn(selected.paid_by)}
                  </span>
                </div>
              </div>

              {/* Participantes */}
              {selected.participants?.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>División</div>
                    {selected.participants.map(p => (
                      <div key={p.user_email} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 6,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar email={p.user_email} size="xs" />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{dn(p.user_email)}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatAmount(p.share_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Pausar / Activar */}
              <button
                id="recurring-toggle-btn"
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: selected.is_active ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: toggling ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: toggling ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {selected.is_active
                  ? <><Pause size={15} /> Pausar gasto recurrente</>
                  : <><Play size={15} /> Reactivar gasto recurrente</>}
              </button>

              {/* Eliminar */}
              <button
                id="recurring-delete-btn"
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: 'rgba(255,59,48,0.06)',
                  color: 'var(--danger)',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 0.2s ease',
                }}
              >
                <Trash2 size={15} /> Eliminar plantilla
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal confirmación eliminar ───────────────────────── */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} centered>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,59,48,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                ¿Eliminar "{selected.description}"?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Se eliminará la plantilla. Los gastos ya registrados no se verán afectados.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                  color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-recurring-btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  border: 'none', background: 'var(--danger)', color: '#fff',
                  fontSize: '0.85rem', fontWeight: 600,
                  cursor: deleting ? 'wait' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
