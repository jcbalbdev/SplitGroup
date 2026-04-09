// src/components/ui/SegmentedControl.jsx
// iOS-style segmented control con pill deslizante animado.
// Soporta `pillColors` para cambiar el color del pill según el tab activo.
//
// Uso básico:
//   <SegmentedControl tabs={[...]} activeKey="a" onChange={fn} />
//
// Con colores por tab:
//   <SegmentedControl tabs={[...]} activeKey="b" onChange={fn}
//     pillColors={{ a: '#fff', b: 'linear-gradient(135deg, #FF8C42, #FFB347)' }}
//     textColors={{ a: 'var(--text-primary)', b: '#fff' }}
//   />
import { useRef, useState, useEffect, useCallback } from 'react';

export function SegmentedControl({
  tabs,
  activeKey,
  onChange,
  pillColors = {},   // { [tabKey]: background CSS value }
  textColors = {},   // { [tabKey]: color when that tab is active }
  size = 'md',       // 'sm' | 'md'
}) {
  const containerRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const activeIdx = tabs.findIndex(t => t.key === activeKey);
    if (activeIdx < 0) return;
    const container = containerRef.current;
    const buttons = container.querySelectorAll('[data-seg-btn]');
    const btn = buttons[activeIdx];
    if (!btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPillStyle({
      left: bRect.left - cRect.left,
      width: bRect.width,
    });
  }, [activeKey, tabs]);

  useEffect(() => {
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [updatePill]);

  const pillBg = pillColors[activeKey] || '#fff';
  const pillShadow = pillBg === '#fff'
    ? '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)'
    : '0 2px 8px rgba(0,0,0,0.12)';

  const paddingY = size === 'sm' ? '6px' : '10px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.82rem';
  const borderRadius = size === 'sm' ? 8 : 12;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        gap: 0,
      }}
    >
      {/* Pill animado */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: pillStyle.left,
          width: pillStyle.width,
          background: pillBg,
          borderRadius,
          boxShadow: pillShadow,
          transition: [
            `left 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
            `width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
            `background 0.35s ease`,
            `box-shadow 0.35s ease`,
          ].join(', '),
          zIndex: 0,
        }}
      />

      {/* Botones */}
      {tabs.map(({ key, label }) => {
        const isActive = activeKey === key;
        const activeColor = textColors[key] || 'var(--text-primary)';
        return (
          <button
            key={key}
            data-seg-btn
            id={`tab-${key}`}
            onClick={() => onChange(key)}
            style={{
              flex: 1,
              position: 'relative',
              zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: `${paddingY} 4px`,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius,
              color: isActive ? activeColor : 'var(--text-muted)',
              fontSize,
              fontWeight: isActive ? 700 : 500,
              transition: 'color 0.25s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
