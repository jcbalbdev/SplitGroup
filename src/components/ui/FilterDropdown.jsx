// src/components/ui/FilterDropdown.jsx
// Botón dropdown con portal (position:fixed) para filtros.
// Self-contained: maneja su propio estado open/close, refs y click-outside.
// No queda cortado por contenedores con overflow:hidden ni transforms CSS.

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * @param {Array}    items       - [{ key, emoji, label }]
 * @param {string}   activeKey   - key actualmente seleccionada
 * @param {Function} onSelect    - callback(key)
 * @param {string}   [icon]      - emoji del botón cuando no hay filtro activo
 * @param {string}   [label]     - texto del botón cuando no hay filtro activo
 * @param {boolean}  [showClear] - muestra botón ✕ al lado cuando hay filtro activo
 * @param {Function} [onClear]   - callback para limpiar; si no se pasa usa onSelect('all')
 */
export function FilterDropdown({ items, activeKey, onSelect, icon = '🏷️', label = 'Filtro', showClear = true, onClear }) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  // Click-outside: cierra el menú salvo que se haga clic en el propio botón
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      const inBtn  = btnRef.current  && btnRef.current.contains(e.target);
      if (!inMenu && !inBtn) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(true);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onSelect('all');
  };

  const isActive = activeKey && activeKey !== 'all';
  const active   = items.find((i) => i.key === activeKey);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 'var(--radius-full)',
          background: isActive ? 'var(--primary)' : 'var(--bg-hover)',
          border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
          color: isActive ? '#fff' : 'var(--text-secondary)',
          fontWeight: 600, fontSize: '0.82rem',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s',
        }}
      >
        {isActive && active ? <>{active.emoji} {active.label}</> : <>{icon} {label}</>}
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
      </button>

      {/* Botón limpiar */}
      {showClear && isActive && (
        <button
          onClick={handleClear}
          style={{
            fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0 2px', alignSelf: 'center',
          }}
        >✕</button>
      )}

      {/* Menú portal */}
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: 99999,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '6px', minWidth: 190,
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {items.map(({ key, emoji, label: itemLabel }) => {
            const isSelected = activeKey === key;
            return (
              <button
                key={key}
                onClick={() => { onSelect(key); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 14px', borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(124,92,252,0.18)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 400, fontSize: '0.85rem',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {emoji} {itemLabel}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
