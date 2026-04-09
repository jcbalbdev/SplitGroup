// src/components/ui/ExpenseDetailModal.jsx
// Modal que muestra el resumen de un gasto (individual o de sesión)
// y permite compartirlo como imagen PNG via Web Share API / descarga.

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { formatAmount } from '../../utils/balanceCalculator';
import { useNicknames } from '../../context/NicknamesContext';
import { Share2, Calendar, Loader2, Trash2 } from 'lucide-react';

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Recibo estético para capturar como imagen ────────────────
function Receipt({ item, groupName }) {
  const { dn } = useNicknames();

  const isSingle  = item.type === 'single';
  const desc      = isSingle ? (item.expense.description || 'Sin descripción') : (item.description || 'Sin descripción');
  const date      = isSingle ? item.expense.date : item.date;
  const total     = isSingle ? parseFloat(item.expense.amount) : item.total;

  return (
    <div style={{
      background: '#ffffff',
      width: 320,
      padding: '28px 24px',
      fontFamily: "'Inter', -apple-system, sans-serif",
      borderRadius: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <img
          src="/logokicoin.png"
          alt="KiCode"
          crossOrigin="anonymous"
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            objectFit: 'cover',
            marginBottom: 8,
            display: 'block',
            margin: '0 auto 8px',
          }}
        />
        {groupName && (
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>{groupName}</div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1.5px dashed #e0e0e0', margin: '0 0 16px' }} />

      {/* Descripción */}
      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a2e', marginBottom: 4 }}>
        {desc}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 16 }}>
        📅 {formatDateLong(date)}
      </div>

      {/* Total */}
      <div style={{
        background: '#f4f0ff',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: '0.85rem', color: '#7c5cfc', fontWeight: 600 }}>TOTAL</span>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c5cfc' }}>{formatAmount(total)}</span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1.5px dashed #e0e0e0', margin: '0 0 14px' }} />

      {/* Pagadores */}
      <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {isSingle ? 'Pagado por' : 'Cada quien pagó'}
      </div>

      {isSingle ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Avatar email={item.expense.paid_by} size="sm" />
          <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>
            {dn(item.expense.paid_by)}
          </div>
          <div style={{ fontWeight: 700, color: '#7c5cfc' }}>{formatAmount(item.expense.amount)}</div>
        </div>
      ) : (
        item.expenses.map((sub) => (
          <div key={sub.expense_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar email={sub.paid_by} size="sm" />
            <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>
              {dn(sub.paid_by)}
            </div>
            <div style={{ fontWeight: 700, color: '#7c5cfc' }}>{formatAmount(sub.amount)}</div>
          </div>
        ))
      )}

      {/* División si es single con participantes */}
      {isSingle && item.expense.participants && item.expense.participants.length > 0 && (() => {
        const parts = item.expense.participants.filter(p => p.user_email !== item.expense.paid_by);
        if (!parts.length) return null;
        return (
          <>
            <div style={{ borderTop: '1.5px dashed #e0e0e0', margin: '14px 0' }} />
            <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              División
            </div>
            {item.expense.participants.map((p) => (
              <div key={p.user_email} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{dn(p.user_email)}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1a2e' }}>{formatAmount(p.share_amount)}</span>
              </div>
            ))}
          </>
        );
      })()}

      {/* Footer */}
      <div style={{ borderTop: '1.5px dashed #e0e0e0', marginTop: 16, paddingTop: 12, textAlign: 'center', fontSize: '0.72rem', color: '#bbb' }}>
        Generado con KiCode · kicode.app
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────
export function ExpenseDetailModal({ isOpen, onClose, item, groupName, onEdit, onDelete }) {
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const { dn }   = useNicknames();
  const isSingle  = item.type === 'single';
  const desc      = isSingle ? (item.expense.description || 'Sin descripción') : (item.description || 'Sin descripción');
  const date      = isSingle ? item.expense.date : item.date;
  const total     = isSingle ? parseFloat(item.expense.amount) : item.total;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
      });

      canvas.toBlob(async (blob) => {
        const filename = `gasto-${desc.replaceAll(' ', '-').toLowerCase()}.png`;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          const file = new File([blob], filename, { type: 'image/png' });
          await navigator.share({
            title: `Gasto: ${desc}`,
            text: `Registro de gasto en KiCode\n${desc} — ${formatAmount(total)}`,
            files: [file],
          });
        } else {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Error compartiendo:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    setConfirmDelete(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} centered>
        {/* Custom header con trash icon */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Resumen del gasto
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                aria-label="Eliminar gasto"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Confirmación de eliminación */}
        {confirmDelete ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            padding: '24px 0',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255, 59, 48, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                ¿Eliminar este gasto?
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                "{desc}" por {formatAmount(total)}
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
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Resumen ── */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 14,
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* Título + fecha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {formatDateLong(date)}
                  </div>
                  {isSingle && item.expense.recurring_id && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 20,
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      fontSize: '0.68rem', fontWeight: 700,
                      letterSpacing: '-0.01em',
                    }}>
                      Recurrente
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                {formatAmount(total)}
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />

            {/* Pagadores */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {isSingle ? 'Pagado por' : 'Cada quien pagó'}
              </div>
              {isSingle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar email={item.expense.paid_by} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                    {dn(item.expense.paid_by)}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatAmount(item.expense.amount)}
                  </span>
                </div>
              ) : (
                item.expenses.map((sub) => (
                  <div key={sub.expense_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Avatar email={sub.paid_by} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                      {dn(sub.paid_by)}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatAmount(sub.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* División — solo gasto individual con participantes */}
            {isSingle && item.expense.participants?.length > 0 && (() => {
              const nonPayer = item.expense.participants.filter(p => p.user_email !== item.expense.paid_by);
              if (!nonPayer.length) return null;
              return (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      División
                    </div>
                    {item.expense.participants.map((p) => (
                      <div key={p.user_email} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dn(p.user_email)}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatAmount(p.share_amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── Botones ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                  color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                Editar
              </button>
            )}
            <button
              id="share-expense-btn"
              onClick={handleShare}
              disabled={sharing}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: 'none',
                background: 'var(--text-primary)', color: '#fff',
                fontSize: '0.85rem', fontWeight: 600,
                cursor: sharing ? 'wait' : 'pointer',
                opacity: sharing ? 0.6 : 1,
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {sharing ? (
                <><Loader2 size={14} className="animate-spin" /> Generando...</>
              ) : (
                <><Share2 size={14} /> Compartir</>
              )}
            </button>
          </div>
        </div>
        )}
      </Modal>

      {/* Recibo oculto fuera de pantalla — es lo que se captura como imagen */}
      <div
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          zIndex: -1,
        }}
      >
        <div ref={receiptRef}>
          <Receipt item={item} groupName={groupName} />
        </div>
      </div>
    </>
  );
}
