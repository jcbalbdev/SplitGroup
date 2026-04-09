// src/components/ui/HelpTooltip.jsx
// Ícono ⓘ con tooltip contextual. Hover en desktop, tap en móvil.
import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export function HelpTooltip({ text, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Cierra al tocar fuera (móvil)
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        aria-label="Más información"
        style={{
          background: 'none',
          border: 'none',
          padding: '0 2px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 1,
          transition: 'color 0.15s ease',
        }}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <HelpCircle size={13} strokeWidth={2} />
      </button>

      {visible && (
        <span
          style={{
            position: 'absolute',
            ...(position === 'top'
              ? { bottom: 'calc(100% + 8px)', top: 'auto' }
              : { top: 'calc(100% + 8px)', bottom: 'auto' }),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            width: 220,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            padding: '9px 12px',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            fontWeight: 500,
            pointerEvents: 'none',
            animation: 'helpTooltipIn 0.15s ease',
            textAlign: 'left',
            whiteSpace: 'normal',
          }}
        >
          {/* Flechita */}
          <span
            style={{
              position: 'absolute',
              ...(position === 'top'
                ? { bottom: -5, top: 'auto' }
                : { top: -5, bottom: 'auto' }),
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderTop: position === 'bottom' ? '1px solid rgba(0,0,0,0.08)' : 'none',
              borderLeft: position === 'bottom' ? '1px solid rgba(0,0,0,0.08)' : 'none',
              borderBottom: position === 'top' ? '1px solid rgba(0,0,0,0.08)' : 'none',
              borderRight: position === 'top' ? '1px solid rgba(0,0,0,0.08)' : 'none',
            }}
          />
          {text}
        </span>
      )}
    </span>
  );
}
