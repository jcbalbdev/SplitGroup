// src/components/ui/FilterDropdown.jsx
// Botón dropdown con portal — estilo iOS minimalista.

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';

export function FilterDropdown({ items, activeKey, onSelect, icon, label = 'Filtro', showClear = true, onClear }) {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

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
          padding: '7px 14px', borderRadius: 12,
          background: isActive ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
          border: `1.5px solid ${isActive ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: isActive ? 700 : 500, fontSize: '0.82rem',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s',
        }}
      >
        {isActive && active ? active.label : label}
        <ChevronDown size={12} style={{ opacity: 0.5 }} />
      </button>

      {showClear && isActive && (
        <button
          onClick={handleClear}
          style={{
            fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0 2px', alignSelf: 'center',
          }}
        ><X size={14} /></button>
      )}

      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: 99999,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: 14, padding: '4px', minWidth: 180,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}
        >
          {items.map(({ key, label: itemLabel }) => {
            const isSelected = activeKey === key;
            return (
              <button
                key={key}
                onClick={() => { onSelect(key); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 14px', borderRadius: 10,
                  background: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500, fontSize: '0.85rem',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {itemLabel}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
