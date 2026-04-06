// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, inviteMember } from '../services/api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { formatAmount } from '../utils/balanceCalculator';
import { displayName } from '../utils/nicknames';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberEmails, setMemberEmails] = useState(['']);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const result = await getGroups(user.email);
      setGroups(result.groups || []);
    } catch (err) {
      toast('Error cargando grupos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const result = await createGroup(groupName.trim(), user.email);
      const groupId = result.groupId;

      // Invitar miembros
      const validEmails = memberEmails.filter((e) => e.trim() && e !== user.email);
      await Promise.all(validEmails.map((email) => inviteMember(groupId, email.trim())));

      toast(`Grupo "${groupName}" creado 🎉`);
      setShowCreateModal(false);
      setGroupName('');
      setMemberEmails(['']);
      await loadGroups();
    } catch (err) {
      toast(err.message || 'Error al crear el grupo', 'error');
    } finally {
      setCreating(false);
    }
  };

  const addEmailField = () => setMemberEmails((prev) => [...prev, '']);
  const updateEmail = (i, val) =>
    setMemberEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  const removeEmail = (i) =>
    setMemberEmails((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">💸</div>
            <span className="logo-text">SplitGroup</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="text-sm text-muted">{displayName(user?.email)}</span>
            <button
              id="logout-btn"
              className="btn btn-ghost btn-sm"
              onClick={logout}
              title="Cerrar sesión"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="container">
          {/* Saludo */}
          <div style={{ marginBottom: 20, marginTop: 8 }} className="animate-fade-in">
            <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>
              Hola, {displayName(user?.email)} 👋
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="text-sm text-muted">Tus grupos de gastos compartidos</p>
              {groups.length > 0 && (
                <button
                  id="create-group-btn"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: '0.82rem' }}
                  onClick={() => setShowCreateModal(true)}
                >
                  + Grupo
                </button>
              )}
            </div>
          </div>

          {/* Lista de grupos */}
          {loading ? (
            <SkeletonList count={3} />
          ) : groups.length === 0 ? (
            <div className="empty-state animate-fade-in">
              <div className="empty-state-icon">🏘️</div>
              <div className="empty-state-title">No tienes grupos aún</div>
              <div className="empty-state-text">
                Crea tu primer grupo para empezar a registrar gastos
              </div>
              <button
                id="create-first-group-btn"
                className="btn btn-primary"
                style={{ marginTop: 8 }}
                onClick={() => setShowCreateModal(true)}
              >
                + Crear grupo
              </button>
            </div>
          ) : (
            <div className="list animate-fade-in">
              {groups.map((g) => {
              return (
                  <div
                    key={g.group_id}
                    id={`group-${g.group_id}`}
                    className="list-item card-interactive"
                    onClick={() => navigate(`/group/${g.group_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/group/${g.group_id}`)}
                  >
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0,
                      }}
                    >
                      👥
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{g.name}</div>
                      <div className="list-item-subtitle">{g.memberCount || 0} miembros</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Modal crear grupo */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo grupo"
      >
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label" htmlFor="group-name-input">Nombre del grupo</label>
            <input
              id="group-name-input"
              className="input"
              type="text"
              placeholder="Ej: Roommates, Vacaciones..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Invitar miembros (opcional)</label>
            {memberEmails.map((email, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}
              >
                <input
                  id={`member-email-${i}`}
                  className="input"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => updateEmail(i, e.target.value)}
                />
                {memberEmails.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => removeEmail(i)}
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addEmailField}
              style={{ alignSelf: 'flex-start' }}
            >
              + Agregar otro
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </button>
            <button
              id="confirm-create-group-btn"
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={creating}
            >
              {creating ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
