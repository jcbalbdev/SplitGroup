// src/components/ui/PageHeader.jsx
// Header reutilizable con botón atrás, título y slot opcional de acción.
// Usado por GroupPage, AddExpensePage, EditExpensePage y EditSessionPage.

/**
 * @param {string}    title      - Título principal
 * @param {string}    [subtitle] - Texto pequeño debajo del título
 * @param {Function}  onBack     - Callback del botón ←
 * @param {ReactNode} [action]   - Elemento extra a la derecha (botón, badge, etc.)
 */
export function PageHeader({ title, subtitle, onBack, action }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {onBack && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={onBack}
              aria-label="Volver"
              style={{ flexShrink: 0 }}
            >
              ←
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="header-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-muted" style={{ marginTop: 1 }}>{subtitle}</div>
            )}
          </div>
        </div>

        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </header>
  );
}
