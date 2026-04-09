// src/pages/GroupPage.jsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { ExpenseDetailModal } from '../components/ui/ExpenseDetailModal';
import { AvatarPickerModal } from '../components/ui/AvatarPickerModal';
import { setGroupNickname, deleteExpense, deleteExpenseSession } from '../services/api';
import { useNicknames } from '../context/NicknamesContext';
import { getCategoryEmoji } from '../utils/categories';
import { CreditCard, Receipt, Users, Plus, BookMarked, Repeat } from 'lucide-react';

// Hooks de dominio
import { useGroupData } from '../hooks/useGroupData';
import { useExpenseFilters } from '../hooks/useExpenseFilters';
import { useDebtFilters } from '../hooks/useDebtFilters';

// Componentes de grupo
import { BalanceWidget } from '../components/group/BalanceWidget';
import { DebtList } from '../components/group/DebtList';
import { ExpenseList } from '../components/group/ExpenseList';
import { MemberList } from '../components/group/MemberList';
import { BudgetList } from '../components/group/BudgetList';
import { RecurringExpenseList } from '../components/group/RecurringExpenseList';

const TABS = [
  { key: 'expenses',   label: 'Gastos',       icon: Receipt    },
  { key: 'budgets',   label: 'Presupuestos', icon: BookMarked },
  { key: 'recurring', label: 'Recurrentes',  icon: Repeat     },
  { key: 'balances',  label: 'Deudas',       icon: CreditCard },
];

export default function GroupPage() {
  const { groupId }  = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const toast        = useToast();

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'expenses');
  const [editingNick,      setEditingNick]      = useState(null);
  const [savingNick,       setSavingNick]       = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarVersion,    setAvatarVersion]    = useState(0);
  const [selectedExpense,  setSelectedExpense]  = useState(null);

  // ── Data ──────────────────────────────────────────────────────
  const {
    group, members, allExpenses, memberGroupsMap,
    dbNicknames, setDbNicknames,
    loading, settlements, reloadSettlements,
    budgets, reloadBudgets,
    recurring, reloadRecurring,
    reload,
  } = useGroupData(groupId, user?.email);

  const { dn, setOneNickname } = useNicknames();

  // ── Filtros ───────────────────────────────────────────────────
  const expenseFilters = useExpenseFilters(allExpenses);
  const debtFilters    = useDebtFilters(allExpenses, settlements, groupId, user?.email);

  // ── Filtros de tab Recurrentes ───────────────────────────────────
  const [recurringFilterId,   setRecurringFilterId]   = useState('all'); // recurring_id o 'all'
  const [recurringDateFrom,   setRecurringDateFrom]   = useState('');
  const [recurringDateTo,     setRecurringDateTo]     = useState('');

  // Gastos generados por plantillas (tienen recurring_id)
  const recurringGenerated = useMemo(() =>
    allExpenses.filter(e => e.recurring_id),
  [allExpenses]);

  // Gastos filtrados por plantilla y fecha
  const recurringFiltered = useMemo(() => {
    let list = recurringGenerated;
    if (recurringFilterId !== 'all') list = list.filter(e => e.recurring_id === recurringFilterId);
    if (recurringDateFrom) list = list.filter(e => e.date >= recurringDateFrom);
    if (recurringDateTo)   list = list.filter(e => e.date <= recurringDateTo);
    return list;
  }, [recurringGenerated, recurringFilterId, recurringDateFrom, recurringDateTo]);

  // Stats para BalanceWidget
  const recurringStats = useMemo(() => {
    const total = recurringFiltered.reduce((s, e) => s + parseFloat(e.amount), 0);
    const templateIds = [...new Set(recurringFiltered.map(e => e.recurring_id))];
    const selectedTemplate = recurring.find(r => r.recurring_id === recurringFilterId);
    const label = recurringFilterId === 'all'
      ? 'Total recurrentes'
      : (selectedTemplate?.description || 'Filtrado');
    return {
      total,
      occurrences: recurringFiltered.length,
      templateCount: templateIds.length,
      label,
    };
  }, [recurringFiltered, recurringFilterId, recurring]);

  // ── Helper: emoji de categoría ────────────────────────────────
  const getEmoji = (category, description = '') =>
    getCategoryEmoji(category || description);

  const buildCatItems = (keys) => keys.map((key) => {
    if (key === 'all') return { key, emoji: '✨', label: 'Todo' };
    return { key, emoji: getCategoryEmoji(key), label: key };
  });

  // ── Guardar apodo ─────────────────────────────────────────────
  const saveNick = async () => {
    if (!editingNick) return;
    setSavingNick(true);
    try {
      await setGroupNickname(groupId, editingNick.email, editingNick.value.trim());
      // Actualizar context global + estado local
      setOneNickname(editingNick.email, editingNick.value.trim());
      setDbNicknames((prev) => {
        const next = { ...prev };
        editingNick.value.trim()
          ? (next[editingNick.email] = editingNick.value.trim())
          : delete next[editingNick.email];
        return next;
      });
      setEditingNick(null);
      toast('Apodo guardado ✅');
    } catch (err) {
      toast(err.message || 'Error al guardar apodo', 'error');
    } finally {
      setSavingNick(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Header sutil */}
      <div style={{
        padding: '16px 16px 0', maxWidth: 480, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>{loading ? '...' : group?.name}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 2 }}>{members.length} miembros</p>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 10,
            padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        >
          ← Grupos
        </button>
      </div>

      <div className="page-content" style={{ paddingBottom: 120 }}>
        <div className="container">
          {loading ? <SkeletonList count={4} /> : (
            <>
              <BalanceWidget
                activeTab={activeTab}
                totalPendingDebt={debtFilters.totalPendingDebt}
                filteredPendingDebts={debtFilters.filteredPendingDebts}
                filteredTotal={expenseFilters.filteredTotal}
                filteredGrouped={expenseFilters.filteredGrouped}
                totalLabel={expenseFilters.totalLabel}
                membersCount={members.length}
                recurringStats={recurringStats}
                budgets={budgets}
              />

              {/* Botón agregar — contextual según la tab activa */}
              {(activeTab === 'expenses' || activeTab === 'budgets' || activeTab === 'recurring' || activeTab === 'balances') && (
                <button
                  id={
                    activeTab === 'expenses'  ? 'add-expense-btn' :
                    activeTab === 'budgets'   ? 'add-budget-btn-dashed' :
                    activeTab === 'recurring' ? 'add-recurring-btn' :
                                               'add-debt-btn'
                  }
                  onClick={() => navigate(
                    activeTab === 'expenses'  ? `/group/${groupId}/add-expense` :
                    activeTab === 'budgets'   ? `/group/${groupId}/add-budget` :
                    activeTab === 'recurring' ? `/group/${groupId}/add-expense?recurring=1` :
                                               `/group/${groupId}/add-expense?debt=1`
                  )}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--text-muted)', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', transition: 'all 0.2s ease',
                    marginBottom: 16,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={22} strokeWidth={2} />
                </button>
              )}

              {activeTab === 'balances' && (
                <DebtList
                  filteredExpenseDebts={debtFilters.filteredExpenseDebts}
                  filteredPendingDebts={debtFilters.filteredPendingDebts}
                  filteredSettledDebts={debtFilters.filteredSettledDebts}
                  debtAvailableCatItems={buildCatItems(debtFilters.debtAvailableCats)}
                  datePresetItems={debtFilters.DATE_PRESET_ITEMS}
                  debtFilterCat={debtFilters.debtFilterCat}
                  setDebtFilterCat={debtFilters.setDebtFilterCat}
                  debtDatePreset={debtFilters.debtDatePreset}
                  setDebtDatePreset={debtFilters.setDebtDatePreset}
                  debtCustomFrom={debtFilters.debtCustomFrom}
                  setDebtCustomFrom={debtFilters.setDebtCustomFrom}
                  debtCustomTo={debtFilters.debtCustomTo}
                  setDebtCustomTo={debtFilters.setDebtCustomTo}
                  onSettle={(id) => debtFilters.handleSettle(id, toast, reloadSettlements)}
                  onUnsettle={(id) => debtFilters.handleUnsettle(id, toast, reloadSettlements)}
                  getEmoji={getEmoji}
                  dn={dn}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpenseList
                  filteredGrouped={expenseFilters.filteredGrouped}
                  availableCatItems={buildCatItems(expenseFilters.availableCategories)}
                  datePresetItems={expenseFilters.DATE_PRESET_ITEMS}
                  filterCategory={expenseFilters.filterCategory}
                  setFilterCategory={expenseFilters.setFilterCategory}
                  datePreset={expenseFilters.datePreset}
                  setDatePreset={expenseFilters.setDatePreset}
                  customFrom={expenseFilters.customFrom}
                  setCustomFrom={expenseFilters.setCustomFrom}
                  customTo={expenseFilters.customTo}
                  setCustomTo={expenseFilters.setCustomTo}
                  onExpenseClick={setSelectedExpense}
                  onEditExpense={(exp) => navigate(`/group/${groupId}/expense/${exp.expense_id}/edit`)}
                  onEditSession={(item) => navigate(`/group/${groupId}/session/${item.sessionId}/edit`, { state: { sessionExpenses: item.expenses, description: item.description, date: item.date, total: item.total } })}
                  pendingDebtByExpenseId={debtFilters.pendingDebtByExpenseId}
                  settlements={settlements}
                  getEmoji={getEmoji}
                  dn={dn}
                />
              )}

              {activeTab === 'recurring' && (
                <RecurringExpenseList
                  recurring={recurring}
                  groupId={groupId}
                  onRefresh={() => { reload(); reloadRecurring(); }}
                  // ― filtros ―
                  allRecurringExpenses={recurringGenerated}
                  filterById={recurringFilterId}
                  setFilterById={setRecurringFilterId}
                  dateFrom={recurringDateFrom}
                  setDateFrom={setRecurringDateFrom}
                  dateTo={recurringDateTo}
                  setDateTo={setRecurringDateTo}
                />
              )}

              {activeTab === 'budgets' && (
                <BudgetList
                  budgets={budgets}
                  groupId={groupId}
                  members={members}
                  onRefresh={reloadBudgets}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Segmented Control (iOS style) ─────────── */}
      {!loading && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', justifyContent: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          padding: '0 20px 12px',
          pointerEvents: 'none',
        }}>
          <nav style={{
            display: 'flex', gap: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 16,
            padding: 5,
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            maxWidth: 400,
            width: '100%',
            pointerEvents: 'auto',
          }}>
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button key={key} id={`tab-${key}`}
                  onClick={() => setActiveTab(key)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'none', cursor: 'pointer',
                    padding: '10px 4px', borderRadius: 12,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: isActive ? '1.5px solid rgba(0, 0, 0, 0.1)' : '1.5px solid transparent',
                    transition: 'all 0.2s ease',
                    fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                  }}>
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <ExpenseDetailModal
        isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)}
        item={selectedExpense} groupName={group?.name}
        onEdit={(item) => {
          setSelectedExpense(null);
          if (item.type === 'single') {
            navigate(`/group/${groupId}/expense/${item.expense.expense_id}/edit`);
          } else {
            navigate(`/group/${groupId}/session/${item.sessionId}/edit`, {
              state: { sessionExpenses: item.expenses, description: item.description, date: item.date, total: item.total }
            });
          }
        }}
        onDelete={async (item) => {
          try {
            if (item.type === 'single') {
              await deleteExpense(item.expense.expense_id);
            } else {
              await deleteExpenseSession(item.sessionId, groupId);
            }
            toast('Gasto eliminado');
            setSelectedExpense(null);
            reload();
          } catch (err) {
            toast(err.message || 'Error al eliminar', 'error');
          }
        }}
      />
      <AvatarPickerModal isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} email={user?.email || ''} onSaved={() => setAvatarVersion((v) => v + 1)} />

      {/* Modal editar apodo */}
      <Modal isOpen={!!editingNick} onClose={() => setEditingNick(null)} title="Editar apodo" centered>
        {editingNick && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="text-xs text-muted" style={{ textAlign: 'center' }}>{editingNick.email}</div>
            <div className="input-group">
              <label className="input-label" htmlFor="nickname-input">Apodo (visible para todos)</label>
              <input id="nickname-input" className="input" type="text"
                placeholder={editingNick.email.split('@')[0]}
                value={editingNick.value} maxLength={20}
                onChange={(e) => setEditingNick((prev) => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveNick()}
                autoFocus />
            </div>
            {editingNick.value.trim() && (
              <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: -8 }}>
                Se mostrará como <strong style={{ color: 'var(--text-primary)' }}>{editingNick.value.trim()}</strong> para todos los miembros
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              {dbNicknames[editingNick.email] && (
                <button className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setEditingNick((p) => ({ ...p, value: '' }))}
                  disabled={savingNick}>
                  Quitar apodo
                </button>
              )}
              <button id="save-nickname-btn" className="btn btn-primary" style={{ flex: 2 }}
                onClick={saveNick}
                disabled={savingNick || (!editingNick.value.trim() && !dbNicknames[editingNick.email])}>
                {savingNick ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
