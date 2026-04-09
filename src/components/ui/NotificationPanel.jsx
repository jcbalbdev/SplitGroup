// src/components/ui/NotificationPanel.jsx
// Panel de notificaciones — estilo iOS igual que ExpenseList
import { useEffect } from 'react';
import { useNicknames } from '../../context/NicknamesContext';
import { formatAmount } from '../../utils/balanceCalculator';
import { ChevronLeft, ChevronRight, Repeat, Receipt, BookMarked, Loader2, RefreshCw } from 'lucide-react';

const FREQ_LABELS = {
  weekly:   'Semanal',
  biweekly: 'Quincenal',
  monthly:  'Mensual',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'ahora';
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

function isToday(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

// Icono cuadrado estilo app con emoji/icono
function AppIcon({ type }) {
  const cfg = {
    expense:   { bg: '#f0f0f0', Icon: Receipt,    color: '#555' },
    budget:    { bg: '#f0f0f0', Icon: BookMarked,  color: '#555' },
    recurring: { bg: 'rgba(255,107,53,0.12)', Icon: Repeat, color: '#FF6B35' },
    recDue:    { bg: 'rgba(255,107,53,0.15)', Icon: Repeat, color: '#FF6B35' },
    recSoon:   { bg: '#f0f0f0', Icon: Repeat,      color: '#999' },
  }[type] || { bg: '#f0f0f0', Icon: Receipt, color: '#555' };

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: cfg.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <cfg.Icon size={20} color={cfg.color} strokeWidth={2} />
    </div>
  );
}

// Sección header — igual que "SALDADAS · 1" en ExpenseList
function SectionLabel({ label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '20px 0 8px',
      fontSize: '0.68rem', fontWeight: 700,
      color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      <span>{label}</span>
      {count != null && (
        <span style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(0,0,0,0.08)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)',
        }}>{count}</span>
      )}
    </div>
  );
}

// Tarjeta blanca contenedora (igual que en ExpenseList)
function Card({ children }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.04)',
    }}>
      {children}
    </div>
  );
}

// Fila dentro de la tarjeta
function NotifRow({ type, title, subtitle, amount, time, isNew, onClick, isLast }) {
  return (
    <>
      <button
        onClick={onClick}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {/* Icono */}
        <AppIcon type={type} />

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 600,
            color: 'var(--text-primary)', lineHeight: 1.3,
            marginBottom: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </div>
        </div>

        {/* Derecha: monto + tiempo + dot + chevron */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 3, flexShrink: 0,
        }}>
          {amount != null && (
            <span style={{
              fontSize: '0.88rem', fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              {formatAmount(amount)}
            </span>
          )}
          <span style={{
            fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400,
          }}>
            {time}
          </span>
        </div>

        {/* Dot unread + chevron */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {isNew && (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#FF6B35',
            }} />
          )}
          <ChevronRight size={14} color="var(--text-muted)" strokeWidth={2} />
        </div>
      </button>

      {/* Divisor interno (no en el último) */}
      {!isLast && (
        <div style={{
          height: 1, background: 'rgba(0,0,0,0.05)',
          marginLeft: 72, // alinea con el texto
        }} />
      )}
    </>
  );
}

export function NotificationPanel({ isOpen, onClose, activity, myRecurring, loading, loaded, onRefresh, onNavigate }) {
  const { dn } = useNicknames();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const today = new Date().toISOString().split('T')[0];
  const todayActivity     = activity.filter(a => isToday(a.createdAt));
  const weekActivity      = activity.filter(a => !isToday(a.createdAt));
  const overdueRecurring  = myRecurring.filter(r => r.next_due_date <= today);
  const upcomingRecurring = myRecurring.filter(r => r.next_due_date > today);

  const totalNew = todayActivity.length + overdueRecurring.length;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.35)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.28s ease',
      }} />

      {/* Panel */}
      <div className="notification-panel" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        zIndex: 201,
        background: 'var(--bg-base)',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.15)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.32s cubic-bezier(0.36, 0.66, 0.04, 1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{
          padding: '52px 20px 0',
          position: 'sticky', top: 0,
          background: 'var(--bg-base)',
          zIndex: 2,
        }}>
          {/* Top row: back + refresh */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 8,
          }}>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 2,
              color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 600, padding: 0,
            }}>
              <ChevronLeft size={20} strokeWidth={2.5} />
              Atrás
            </button>
            <button onClick={onRefresh} disabled={loading} style={{
              background: 'none', border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              color: 'var(--text-muted)',
              opacity: loading ? 0.4 : 1,
              padding: 4, borderRadius: 8,
              transition: 'opacity 0.2s',
            }}>
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Título grande + badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            paddingBottom: 4,
          }}>
            <h1 style={{
              fontSize: '2rem', fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0, lineHeight: 1,
            }}>
              Notificaciones
            </h1>
            {totalNew > 0 && (
              <span style={{
                background: 'var(--primary)', color: '#fff',
                fontSize: '0.8rem', fontWeight: 800,
                borderRadius: 20, padding: '3px 9px',
                letterSpacing: '-0.01em',
              }}>
                {totalNew}
              </span>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: '0 20px 40px' }}>
          {loading && !loaded ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
              <Loader2 size={24} color="var(--text-muted)" />
            </div>
          ) : (
            <>
              {/* ── Hoy ──────────────────────────────────────── */}
              {todayActivity.length > 0 && (
                <>
                  <SectionLabel label="Hoy" count={todayActivity.length} />
                  <Card>
                    {todayActivity.map((item, i) => (
                      <NotifRow
                        key={`${item.type}-${item.id}`}
                        type={item.type}
                        title={`${dn(item.actor)} · "${item.description}"`}
                        subtitle={`${item.type === 'expense' ? 'Registró un gasto' : item.type === 'budget' ? 'Creó un presupuesto' : 'Agregó un recurrente'} en ${item.groupName}`}
                        amount={item.amount}
                        time={timeAgo(item.createdAt)}
                        isNew
                        isLast={i === todayActivity.length - 1}
                        onClick={() => onNavigate?.(item.groupId)}
                      />
                    ))}
                  </Card>
                </>
              )}

              {/* ── Esta semana ──────────────────────────────── */}
              {weekActivity.length > 0 && (
                <>
                  <SectionLabel label="Esta semana" count={weekActivity.length} />
                  <Card>
                    {weekActivity.map((item, i) => (
                      <NotifRow
                        key={`${item.type}-${item.id}`}
                        type={item.type}
                        title={`${dn(item.actor)} · "${item.description}"`}
                        subtitle={`${item.type === 'expense' ? 'Registró un gasto' : item.type === 'budget' ? 'Creó un presupuesto' : 'Agregó un recurrente'} en ${item.groupName}`}
                        amount={item.amount}
                        time={timeAgo(item.createdAt)}
                        isNew={false}
                        isLast={i === weekActivity.length - 1}
                        onClick={() => onNavigate?.(item.groupId)}
                      />
                    ))}
                  </Card>
                </>
              )}

              {/* Sin actividad */}
              {activity.length === 0 && loaded && (
                <>
                  <SectionLabel label="Actividad" />
                  <Card>
                    <div style={{
                      padding: '24px 16px', textAlign: 'center',
                      fontSize: '0.83rem', color: 'var(--text-muted)',
                    }}>
                      Sin actividad de otros miembros en los últimos 7 días
                    </div>
                  </Card>
                </>
              )}

              {/* ── Vencidos ─────────────────────────────────── */}
              {overdueRecurring.length > 0 && (
                <>
                  <SectionLabel label="Vencidos" count={overdueRecurring.length} />
                  <Card>
                    {overdueRecurring.map((r, i) => (
                      <NotifRow
                        key={r.recurring_id}
                        type="recDue"
                        title={r.description}
                        subtitle={`${r.groups?.name} · ${FREQ_LABELS[r.frequency]} · pendiente de registro`}
                        amount={r.amount}
                        time="vencido"
                        isNew
                        isLast={i === overdueRecurring.length - 1}
                        onClick={() => onNavigate?.(r.groups?.group_id)}
                      />
                    ))}
                  </Card>
                </>
              )}

              {/* ── Próximos ─────────────────────────────────── */}
              {upcomingRecurring.length > 0 && (
                <>
                  <SectionLabel label="Próximos" count={upcomingRecurring.length} />
                  <Card>
                    {upcomingRecurring.map((r, i) => {
                      const daysUntil = Math.ceil(
                        (new Date(r.next_due_date) - new Date(today)) / 86400000
                      );
                      return (
                        <NotifRow
                          key={r.recurring_id}
                          type="recSoon"
                          title={r.description}
                          subtitle={`${r.groups?.name} · ${FREQ_LABELS[r.frequency]}`}
                          amount={r.amount}
                          time={daysUntil === 1 ? 'mañana' : `en ${daysUntil}d`}
                          isNew={false}
                          isLast={i === upcomingRecurring.length - 1}
                          onClick={() => onNavigate?.(r.groups?.group_id)}
                        />
                      );
                    })}
                  </Card>
                </>
              )}

              {/* Estado: no cargado aún */}
              {!loaded && !loading && (
                <div style={{ textAlign: 'center', paddingTop: 40 }}>
                  <button onClick={onRefresh} style={{
                    background: 'var(--text-primary)', color: '#fff',
                    border: 'none', borderRadius: 14, padding: '12px 24px',
                    fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    Cargar notificaciones
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
