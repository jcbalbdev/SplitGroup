// src/components/shared/SplitSection.jsx
// Sección "División de gastos" con toggle S/. / % y lista de participantes.
// Reutilizado por ExpenseForm y BudgetItemForm.
import { Avatar } from '../ui/Avatar';
import { SumIndicator } from './SumIndicator';

const SPLIT_MODES = { AMOUNT: 'amount', PERCENT: 'percent' };

export function SplitSection({
  participants, splitMode, setSplitMode,
  totalAmount, splitDiff,
  toggleParticipant, updateValue, splitEqually,
  dn,
}) {
  const selectedParticipants = participants.filter(p => p.selected);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="input-label" style={{ margin: 0 }}>División de gastos</div>
        <div className="tabs" style={{ width: 'auto', gap: 2, padding: 3 }}>
          <div
            className={`tab ${splitMode === SPLIT_MODES.AMOUNT ? 'active' : ''}`}
            onClick={() => setSplitMode(SPLIT_MODES.AMOUNT)}
            style={{ padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>
            S/.
          </div>
          <div
            className={`tab ${splitMode === SPLIT_MODES.PERCENT ? 'active' : ''}`}
            onClick={() => setSplitMode(SPLIT_MODES.PERCENT)}
            style={{ padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>
            %
          </div>
        </div>
      </div>

      {totalAmount > 0 && (
        <button type="button" className="btn btn-secondary btn-sm"
          onClick={splitEqually}
          style={{ marginBottom: 12, width: '100%' }}>
          ⚡ Dividir equitativamente
        </button>
      )}

      {participants.map(p => (
        <div key={p.email} className="participant-row">
          <input type="checkbox" checked={p.selected}
            onChange={() => toggleParticipant(p.email)}
            style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <Avatar email={p.email} size="sm" />
          <span style={{
            flex: 1, fontSize: '0.85rem', fontWeight: 500,
            color: p.selected ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            {dn(p.email)}
          </span>
          {p.selected && (
            <input
              className="input" type="number" min="0" step="0.01"
              max={splitMode === SPLIT_MODES.PERCENT ? 100 : undefined}
              placeholder={splitMode === SPLIT_MODES.PERCENT ? '0' : '0.00'}
              value={p.value}
              onChange={e => updateValue(p.email, e.target.value)}
              style={{ maxWidth: 90, textAlign: 'right' }}
            />
          )}
        </div>
      ))}

      {selectedParticipants.length > 0 && totalAmount > 0 && (
        <SumIndicator ok={Math.abs(splitDiff) < 0.05} diff={splitDiff} total={totalAmount} mode={splitMode} />
      )}
    </div>
  );
}

export { SPLIT_MODES };
