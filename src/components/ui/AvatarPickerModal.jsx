// src/components/ui/AvatarPickerModal.jsx
// Modal para que el usuario actual elija su estilo y paleta de avatar.

import { useState } from 'react';
import BoringAvatar from 'boring-avatars';
import { Modal } from './Modal';
import {
  VARIANTS, PALETTES,
  getAvatarPref, setAvatarPref,
} from '../../utils/avatarPrefs';

export function AvatarPickerModal({ isOpen, onClose, email, onSaved }) {
  const initial      = getAvatarPref(email);
  const [variant,  setVariant]  = useState(initial.variant);
  const [paletteKey, setPalette] = useState(initial.palette);

  const currentPalette = PALETTES.find((p) => p.key === paletteKey) || PALETTES[0];

  const handleSave = () => {
    setAvatarPref(email, { variant, palette: paletteKey });
    onSaved?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tu avatar" centered>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Preview grande */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 0 0 4px rgba(124,92,252,0.3)',
          }}>
            <BoringAvatar
              size={96}
              name={email}
              variant={variant}
              colors={currentPalette.colors}
              square={false}
            />
          </div>
        </div>

        {/* Selección de estilo */}
        <div>
          <div className="text-xs text-muted" style={{
            textTransform: 'uppercase', letterSpacing: '0.07em',
            fontWeight: 700, marginBottom: 12,
          }}>Estilo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {VARIANTS.map((v) => {
              const isActive = variant === v.key;
              return (
                <button
                  key={v.key}
                  id={`avatar-variant-${v.key}`}
                  onClick={() => setVariant(v.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '10px 8px', borderRadius: 'var(--radius-md)',
                    background: isActive ? 'rgba(124,92,252,0.18)' : 'var(--bg-hover)',
                    border: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ borderRadius: '50%', overflow: 'hidden', width: 44, height: 44 }}>
                    <BoringAvatar size={44} name={email} variant={v.key} colors={currentPalette.colors} square={false} />
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: isActive ? 700 : 400,
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  }}>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selección de paleta */}
        <div>
          <div className="text-xs text-muted" style={{
            textTransform: 'uppercase', letterSpacing: '0.07em',
            fontWeight: 700, marginBottom: 12,
          }}>Colores</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PALETTES.map((p) => {
              const isActive = paletteKey === p.key;
              return (
                <button
                  key={p.key}
                  id={`avatar-palette-${p.key}`}
                  onClick={() => setPalette(p.key)}
                  title={p.label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    fontFamily: 'inherit',
                  }}
                >
                  {/* Mini paleta de círculos */}
                  <div style={{
                    display: 'flex', gap: 2, padding: '4px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    background: isActive ? 'rgba(124,92,252,0.1)' : 'transparent',
                    transition: 'all 0.18s ease',
                  }}>
                    {p.colors.slice(0, 4).map((c, i) => (
                      <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: isActive ? 700 : 400,
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  }}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button id="save-avatar-btn" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
            Guardar avatar
          </button>
        </div>
      </div>
    </Modal>
  );
}
