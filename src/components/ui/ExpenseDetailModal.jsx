// src/components/ui/ExpenseDetailModal.jsx
// Modal que muestra el resumen de un gasto (individual o de sesión)
// y permite compartirlo como imagen PNG via Web Share API / descarga.

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { formatAmount } from '../../utils/balanceCalculator';
import { displayName, getNicknames } from '../../utils/nicknames';
import { Share2, Calendar, Loader2, Split } from 'lucide-react';

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
  const nicknames = getNicknames();
  const dn = (email) => displayName(email, nicknames);

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
        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>💸</div>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#7c5cfc', letterSpacing: '-0.01em' }}>
          SplitGroup
        </div>
        {groupName && (
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>{groupName}</div>
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
        Generado con SplitGroup · splitgroup.app
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────
export function ExpenseDetailModal({ isOpen, onClose, item, groupName }) {
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  if (!item) return null;

  const nicknames = getNicknames();
  const dn        = (email) => displayName(email, nicknames);
  const isSingle  = item.type === 'single';
  const desc      = isSingle ? (item.expense.description || 'Sin descripción') : (item.description || 'Sin descripción');
  const date      = isSingle ? item.expense.date : item.date;
  const total     = isSingle ? parseFloat(item.expense.amount) : item.total;

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,           // alta resolución
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob(async (blob) => {
        const filename = `gasto-${desc.replaceAll(' ', '-').toLowerCase()}.png`;

        // Intentar Web Share API (funciona en móvil)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          const file = new File([blob], filename, { type: 'image/png' });
          await navigator.share({
            title: `Gasto: ${desc}`,
            text: `Registro de gasto en SplitGroup\n${desc} — ${formatAmount(total)}`,
            files: [file],
          });
        } else {
          // Fallback: descargar la imagen
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Resumen del gasto" centered>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Resumen en tema oscuro (vista en la app) ── */}
          <div style={{
            background: 'var(--bg-hover)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* Título + fecha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{desc}</div>
                <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                  <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {formatDateLong(date)}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                {formatAmount(total)}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            {/* Pagadores */}
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {isSingle ? 'Pagado por' : 'Cada quien pagó'}
              </div>
              {isSingle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar email={item.expense.paid_by} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                    {dn(item.expense.paid_by)}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>
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
                    <span className="font-bold" style={{ color: 'var(--primary)' }}>
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
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      División
                    </div>
                    {item.expense.participants.map((p) => (
                      <div key={p.user_email} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{dn(p.user_email)}</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatAmount(p.share_amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── Botón compartir ── */}
          <button
            id="share-expense-btn"
            className="btn btn-primary btn-full"
            onClick={handleShare}
            disabled={sharing}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {sharing ? (
              <><Loader2 size={16} className="animate-spin" /> Generando imagen...</>
            ) : (
              <>
                <Share2 size={16} /> Compartir como imagen
              </>
            )}
          </button>
          <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: -12 }}>
            Comparte el recibo por WhatsApp, Instagram u otras apps
          </div>
        </div>
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
