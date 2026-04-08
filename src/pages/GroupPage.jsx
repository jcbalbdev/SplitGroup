// src/pages/GroupPage.jsx
import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { ExpenseDetailModal } from '../components/ui/ExpenseDetailModal';
import { AvatarPickerModal } from '../components/ui/AvatarPickerModal';
import { setGroupNickname } from '../services/api';
import { useNicknames } from '../context/NicknamesContext';
import { getCategoryEmoji } from '../utils/categories';
import { CreditCard, Receipt, Users, Plus, BookMarked } from 'lucide-react';

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

const TABS = [
  { key: 'balances', label: 'Deudas',       icon: CreditCard  },
  { key: 'expenses', label: 'Gastos',       icon: Receipt     },
  { key: 'members',  label: 'Miembros',     icon: Users       },
  { key: 'budgets',  label: 'Presupuestos', icon: BookMarked  },
];

export default function GroupPage() {
  const { groupId }  = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const toast        = useToast();

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'balances');
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
  } = useGroupData(groupId, user?.email);

  const { dn, setOneNickname } = useNicknames();

  // ── Filtros ───────────────────────────────────────────────────
  const expenseFilters = useExpenseFilters(allExpenses);
  const debtFilters    = useDebtFilters(allExpenses, settlements, groupId, user?.email);

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
      <PageHeader
        title={loading ? '...' : group?.name}
        subtitle={`${members.length} miembros`}
        onBack={() => navigate('/')}
        action={
          <button id="add-expense-fab-header" className="btn btn-primary btn-sm" onClick={() => navigate(`/group/${groupId}/add-expense`)}>
            <Plus size={14} /> Gasto
          </button>
        }
      />

      <div className="page-content">
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
              />

              <div className="tabs" style={{ marginBottom: 12 }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                  <div key={key} id={`tab-${key}`} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                    <Icon size={15} /> {label}
                  </div>
                ))}
              </div>

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

              {activeTab === 'members' && (
                <MemberList
                  members={members}
                  memberGroupsMap={memberGroupsMap}
                  nicknames={dbNicknames}
                  currentUserEmail={user?.email}
                  avatarVersion={avatarVersion}
                  onEditNickname={setEditingNick}
                  onAvatarClick={() => setShowAvatarPicker(true)}
                  dn={dn}
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

      <ExpenseDetailModal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)} item={selectedExpense} groupName={group?.name} />
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
