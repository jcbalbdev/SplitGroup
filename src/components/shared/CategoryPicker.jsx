// src/components/shared/CategoryPicker.jsx
// Selector de categoría con chips de historial + input libre. Reutilizado por ExpenseForm y BudgetItemForm.
import { getCategoryEmoji } from '../../utils/categories';

export function CategoryPicker({ category, setCategory, usedCategories = [], datalistId = 'category-suggestions' }) {
  return (
    <div className="input-group">
      <label className="input-label">Categoría</label>

      {usedCategories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {usedCategories.map(cat => {
            const active = category.toLowerCase() === cat;
            return (
              <button
                key={cat} type="button"
                onClick={() => setCategory(active ? '' : cat)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 'var(--radius-full)',
                  background: active ? 'var(--primary)' : 'var(--bg-hover)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 400, fontSize: '0.8rem',
                  cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}>
                {getCategoryEmoji(cat)} {cat}
              </button>
            );
          })}
        </div>
      )}

      <input
        className="input" type="text"
        placeholder="Escribe la categoría (ej: Gym, Mascota, Comida...)"
        value={category}
        onChange={e => setCategory(e.target.value)}
        list={datalistId}
      />
      <datalist id={datalistId}>
        {usedCategories.map(cat => <option key={cat} value={cat} />)}
      </datalist>
    </div>
  );
}
