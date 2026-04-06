// src/components/ui/Modal.jsx
import { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, children, centered = false }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay ${centered ? 'centered' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal ${centered ? 'centered' : ''}`}>
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
