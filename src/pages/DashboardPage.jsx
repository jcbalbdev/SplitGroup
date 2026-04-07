// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, inviteAndCreateMember, deleteGroup } from '../services/api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { displayName } from '../utils/nicknames';
import { getCached, setCached, clearCached } from '../utils/cache';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const GROUPS_KEY = `groups_${user?.email}`;
  const rawSeed    = getCached(GROUPS_KEY)?.data;
  const seedGroups = Array.isArray(rawSeed) ? rawSeed : [];

  const [groups,          setGroups]          = useState(seedGroups);
  const [loading,         setLoading]         = useState(seedGroups.length === 0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName,       setGroupName]       = useState('');
  const [members, setMembers] = useState([{ email: '', password: '' }]);
  const [creating, setCreating] = useState(false);
  const [showPassIdx, setShowPassIdx] = useState(null);
  // Delete group
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await getGroups(user.email);
      const fresh = Array.isArray(result?.groups) ? result.groups : [];
      setGroups(fresh);
      setCached(GROUPS_KEY, fresh);
    } catch {
      if (seedGroups.length === 0) toast('Error cargando grupos', 'error');
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
      const groupId = result.group_id;

      const validMembers = members.filter((m) => m.email.trim() && m.email !== user.email);
      const results = await Promise.allSettled(
        validMembers.map((m) => inviteAndCreateMember(groupId, m.email.trim(), m.password))
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        toast(`Grupo creado, pero ${failed.length} miembro(s) no pudieron ser añadidos`, 'error');
      } else {
        toast(`Grupo "${groupName}" creado 🎉`);
      }

      clearCached(GROUPS_KEY); // invalidar caché
      setShowCreateModal(false);
      setGroupName('');
      setMembers([{ email: '', password: '' }]);
      await loadGroups();
    } catch (err) {
      toast(err.message || 'Error al crear el grupo', 'error');
    } finally {
      setCreating(false);
    }
  };

  const addMember    = () => setMembers((p) => [...p, { email: '', password: '' }]);
  const removeMember = (i) => setMembers((p) => p.filter((_, idx) => idx !== i));
  const updateMember = (i, field, val) =>
    setMembers((p) => p.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  const handleDeleteGroup = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteGroup(confirmDelete.group_id);
      toast(`Grupo "${confirmDelete.name}" eliminado`);
      clearCached(GROUPS_KEY); // invalidar caché
      setConfirmDelete(null);
      await loadGroups();
    } catch (err) {
      toast(err.message || 'Error al eliminar el grupo', 'error');
    } finally {
      setDeleting(false);
    }
  };

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
            <button id="logout-btn" className="btn btn-ghost btn-sm" onClick={logout} title="Cerrar sesión">
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
              <div className="empty-state-text">Crea tu primer grupo para empezar a registrar gastos</div>
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
              {groups.map((g) => (
                <div
                  key={g.group_id}
                  id={`group-${g.group_id}`}
                  className="list-item card-interactive"
                  style={{ paddingRight: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/group/${g.group_id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/group/${g.group_id}`)}
                    role="button" tabIndex={0}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>👥</div>
                    <div className="list-item-content">
                      <div className="list-item-title">{g.name}</div>
                      <div className="list-item-subtitle">{g.memberCount || 0} miembros</div>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    title="Eliminar grupo"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ group_id: g.group_id, name: g.name }); }}
                    style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}
                  >🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal crear grupo */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo grupo">
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nombre del grupo */}
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

          {/* Miembros */}
          <div className="input-group">
            <label className="input-label">Agregar miembros (opcional)</label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
              Se creará una cuenta para cada miembro. Comparte el email y contraseña con ellos.
            </p>

            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6,
                background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 12px',
                marginBottom: 8, border: '1px solid var(--border)' }}>

                {/* Fila email + botón quitar */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    id={`member-email-${i}`}
                    className="input"
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={m.email}
                    onChange={(e) => updateMember(i, 'email', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {members.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon"
                      onClick={() => removeMember(i)} aria-label="Quitar">
                      ✕
                    </button>
                  )}
                </div>

                {/* Contraseña temporal */}
                <div style={{ position: 'relative' }}>
                  <input
                    id={`member-pass-${i}`}
                    className="input"
                    type={showPassIdx === i ? 'text' : 'password'}
                    placeholder="Contraseña temporal (mín. 6 caracteres)"
                    value={m.password}
                    onChange={(e) => updateMember(i, 'password', e.target.value)}
                    minLength={6}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button"
                    onClick={() => setShowPassIdx(showPassIdx === i ? null : i)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '1rem' }}>
                    {showPassIdx === i ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-secondary btn-sm"
              onClick={addMember} style={{ alignSelf: 'flex-start' }}>
              + Agregar otro
            </button>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => setShowCreateModal(false)}>
              Cancelar
            </button>
            <button id="confirm-create-group-btn" type="submit"
              className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
              {creating ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmación eliminar grupo */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar grupo" centered>
        {confirmDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
              ¿Seguro que quieres eliminar <strong style={{ color: 'var(--text-primary)' }}>"{confirmDelete.name}"</strong>?
              <br />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Se eliminarán todos los gastos y miembros del grupo. Esta acción no se puede deshacer.
              </span>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancelar
              </button>
              <button id="confirm-delete-group-btn" className="btn btn-primary"
                style={{ flex: 1, background: 'var(--error, #e53e3e)', borderColor: 'var(--error, #e53e3e)' }}
                onClick={handleDeleteGroup} disabled={deleting}>
                {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
