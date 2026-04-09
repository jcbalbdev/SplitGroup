// src/components/group/ExternalDebtDetailModal.jsx
// Modal "Resumen del préstamo" — muestra detalle de una deuda externa
// con opción para cobrar o reactivar.
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { DebtStatusBadge } from '../ui/DebtStatusBadge';
import { formatAmount } from '../../utils/balanceCalculator';
import { settleExternalDebt, unsettleExternalDebt } from '../../services/api';
import { useToast } from '../ui/Toast';

export function ExternalDebtDetailModal({ isOpen, debt, onClose, onAction }) {
  const toast      = useToast();
  const [busy, setBusy] = useState(false);

  if (!debt) return null;

  const isSettled = debt.status === 'settled';
  const formattedDate = new Date(debt.date + 'T12:00:00').toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (isSettled) {
        await unsettleExternalDebt(debt.id);
        toast('Deuda reactivada');
      } else {
        await settleExternalDebt(debt.id);
        toast('¡Cobrado! 💰');
      }
      onClose();
      onAction?.();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resumen del préstamo" centered>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Card principal */}
        <div style={{ background: 'var(--bg-secondary, #f5f5f7)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                {debt.description || debt.debtor_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>📅 {formattedDate}</span>
                <DebtStatusBadge status={debt.status} />
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: isSettled ? 'var(--success)' : 'var(--danger)' }}>
              {formatAmount(debt.amount)}
            </div>
          </div>

          {debt.category && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {debt.category}
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 12, paddingTop: 12 }}>
            <div style={{
              fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              Deudor
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={debt.debtor_name} size="sm" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {debt.debtor_name}
                </span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {formatAmount(debt.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: 14,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            }}>
            Cerrar
          </button>
          <button
            disabled={busy}
            onClick={handleToggle}
            style={{
              flex: 1, padding: '14px', borderRadius: 14, border: 'none',
              background: isSettled ? 'rgba(0,0,0,0.08)' : 'var(--text-primary)',
              color: isSettled ? 'var(--text-secondary)' : '#fff',
              fontSize: '0.9rem', fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}>
            {busy ? '...' : isSettled ? 'Reactivar' : 'Cobrado ✓'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
