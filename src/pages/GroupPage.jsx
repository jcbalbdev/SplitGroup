// src/pages/GroupPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/PageHeader';
import { ExpenseDetailModal } from '../components/ui/ExpenseDetailModal';
import { AvatarPickerModal } from '../components/ui/AvatarPickerModal';
import { getNicknames, setNickname, displayName } from '../utils/nicknames';
import { getCategoryEmojiFromDesc, getCategoryMeta } from '../utils/categories';
import { getCategoryOverrides } from '../utils/categoryOverrides';

// Hooks de dominio
import { useGroupData } from '../hooks/useGroupData';
import { useExpenseFilters } from '../hooks/useExpenseFilters';
import { useDebtFilters } from '../hooks/useDebtFilters';

// Componentes de grupo
import { BalanceWidget } from '../components/group/BalanceWidget';
import { DebtList } from '../components/group/DebtList';
import { ExpenseList } from '../components/group/ExpenseList';
import { MemberList } from '../components/group/MemberList';

const TABS = [
  { key: 'balances', label: '💳 Deudas' },
  { key: 'expenses', label: '🧾 Gastos' },
  { key: 'members',  label: '👥 Miembros' },
];

export default function GroupPage() {
  const { groupId }  = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();

  const [activeTab,        setActiveTab]        = useState('balances');
  const [nicknames,        setNicknamesState]   = useState(getNicknames);
  const [editingNick,      setEditingNick]       = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarVersion,    setAvatarVersion]    = useState(0);
  const [selectedExpense,  setSelectedExpense]  = useState(null);

  // ── Data ──────────────────────────────────────────────────────
  const {
    group, members, allExpenses, memberGroupsMap,
    loading, settlements, reloadSettlements,
  } = useGroupData(groupId, user?.email);

  // categoryOverrides (locales, para emojis personalizados)
  const [categoryOverrides] = useState(getCategoryOverrides);

  // ── Filtros Gastos ────────────────────────────────────────────
  const expenseFilters = useExpenseFilters(allExpenses, categoryOverrides);

  // ── Filtros + Acciones Deudas ─────────────────────────────────
  const debtFilters = useDebtFilters(allExpenses, settlements, groupId, user?.email);

  // ── Helpers ───────────────────────────────────────────────────
  const dn = (email) => displayName(email, nicknames);

  const getEmojiByExpenseId = (expenseId, description) => {
    const ov = categoryOverrides[expenseId];
    return ov ? ov.emoji : getCategoryEmojiFromDesc(description);
  };

  const getExpenseCategoryEmoji = (exp) => {
    const ov = categoryOverrides[exp.expense_id];
    return ov ? ov.emoji : getCategoryEmojiFromDesc(exp.description);
  };

  const buildCatItems = (keys) => keys.map((key) => {
    if (key === 'all') return { key, emoji: '✨', label: 'Todo' };
    if (key.startsWith('custom_')) return { key, emoji: '💰', label: key.replace('custom_', '') };
    const meta = getCategoryMeta(key);
    return { key, emoji: meta.emoji, label: meta.label };
  });

  const saveNick = () => {
    if (!editingNick) return;
    setNickname(editingNick.email, editingNick.value);
    setNicknamesState(getNicknames());
    setEditingNick(null);
    toast('Apodo guardado ✅');
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
            + Gasto
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

              {/* Tabs */}
              <div className="tabs" style={{ marginBottom: 12 }}>
                {TABS.map(({ key, label }) => (
                  <div key={key} id={`tab-${key}`} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</div>
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
                  getEmojiByExpenseId={getEmojiByExpenseId}
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
                  onEditExpense={(exp) => navigate(`/group/${groupId}/expense/${exp.expense_id}/edit`, { state: { usedCategoryKeys: expenseFilters.availableCategories } })}
                  onEditSession={(item) => navigate(`/group/${groupId}/session/${item.sessionId}/edit`, { state: { sessionExpenses: item.expenses, description: item.description, date: item.date, total: item.total } })}
                  pendingDebtByExpenseId={debtFilters.pendingDebtByExpenseId}
                  settlements={debtFilters.settlements}
                  getExpenseCategoryEmoji={getExpenseCategoryEmoji}
                  dn={dn}
                />
              )}

              {activeTab === 'members' && (
                <MemberList
                  members={members}
                  memberGroupsMap={memberGroupsMap}
                  nicknames={nicknames}
                  currentUserEmail={user?.email}
                  avatarVersion={avatarVersion}
                  onEditNickname={setEditingNick}
                  onAvatarClick={() => setShowAvatarPicker(true)}
                  dn={dn}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ExpenseDetailModal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)} item={selectedExpense} groupName={group?.name} />
      <AvatarPickerModal isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} email={user?.email || ''} onSaved={() => setAvatarVersion((v) => v + 1)} />

      <Modal isOpen={!!editingNick} onClose={() => setEditingNick(null)} title="Editar apodo" centered>
        {editingNick && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="text-xs text-muted" style={{ textAlign: 'center' }}>{editingNick.email}</div>
            <div className="input-group">
              <label className="input-label" htmlFor="nickname-input">Apodo</label>
              <input id="nickname-input" className="input" type="text" placeholder={editingNick.email.split('@')[0]} value={editingNick.value} maxLength={20}
                onChange={(e) => setEditingNick((prev) => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveNick()} autoFocus />
            </div>
            {editingNick.value.trim() && (
              <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: -8 }}>
                Se mostrará como <strong style={{ color: 'var(--text-primary)' }}>{editingNick.value.trim()}</strong> en toda la app
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              {nicknames[editingNick.email] && (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setNickname(editingNick.email, ''); setNicknamesState(getNicknames()); setEditingNick(null); toast('Apodo eliminado'); }}>
                  Quitar apodo
                </button>
              )}
              <button id="save-nickname-btn" className="btn btn-primary" style={{ flex: 2 }} onClick={saveNick} disabled={!editingNick.value.trim() && !nicknames[editingNick.email]}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
