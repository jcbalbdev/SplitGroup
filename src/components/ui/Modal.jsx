// src/components/ui/Modal.jsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, centered = false, fullscreen = false }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayClass = `modal-overlay${centered ? ' centered' : ''}${fullscreen ? ' fullscreen' : ''}`;
  const modalClass = `modal${centered ? ' centered' : ''}${fullscreen ? ' fullscreen' : ''}`;

  return (
    <div className={overlayClass} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={modalClass}>
        {title && (
          <div className="modal-header" style={fullscreen ? { position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, paddingBottom: 16 } : undefined}>
            <h3 className="modal-title">{title}</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
