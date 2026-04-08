// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, inviteAndCreateMember, deleteGroup, changePassword } from '../services/api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { useNicknames } from '../context/NicknamesContext';
import { getCached, setCached, clearCached } from '../utils/cache';
import { LogOut, Trash2, Plus, Users, Split, X, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { dn } = useNicknames();

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
  // Change password
  const [showPasswordModal,  setShowPasswordModal]  = useState(false);
  const [currentPassword,    setCurrentPassword]    = useState('');
  const [newPassword,        setNewPassword]        = useState('');
  const [confirmPassword,    setConfirmPassword]    = useState('');
  const [changingPassword,   setChangingPassword]   = useState(false);
  const [showCurrentPass,    setShowCurrentPass]    = useState(false);
  const [showNewPass,        setShowNewPass]        = useState(false);

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
            <div className="logo-icon"><Split size={20} /></div>
            <span className="logo-text">SplitGroup</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setShowPasswordModal(true)} title="Cambiar contraseña"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <KeyRound size={16} />
            </button>
            <button id="logout-btn" onClick={logout} title="Cerrar sesión"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <div className="container">
          {/* Widget estilo grande */}
          <div style={{ padding: '24px 0 8px', marginBottom: 16 }} className="animate-fade-in">
            <div style={{
              fontWeight: 900, fontSize: 'clamp(2.5rem, 12vw, 4rem)',
              letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
              color: 'var(--text-primary)',
            }}>
              Hola, {dn(user?.email)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 12px', borderRadius: 20,
                background: 'rgba(0, 0, 0, 0.04)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem', fontWeight: 600,
              }}>Tus grupos de gastos compartidos</span>
            </div>
          </div>

          {/* Lista de grupos */}
          {loading ? (
            <SkeletonList count={3} />
          ) : groups.length === 0 ? (
            <div className="empty-state animate-fade-in">
              <div className="empty-state-icon"><Users size={48} strokeWidth={1.5} /></div>
              <div className="empty-state-title">No tienes grupos aún</div>
              <div className="empty-state-text">Crea tu primer grupo para empezar a registrar gastos</div>
              <button
                id="create-first-group-btn"
                onClick={() => setShowCreateModal(true)}
                style={{
                  marginTop: 16, width: '100%', padding: '18px', borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--text-muted)', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Plus size={24} color="currentColor" strokeWidth={2} />
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
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                      paddingLeft: 4,
                    }}>
                      {(g.memberEmails || []).slice(0, 3).map((email, i) => (
                        <div key={email} style={{
                          marginLeft: i === 0 ? 0 : -10,
                          zIndex: 3 - i,
                          borderRadius: '50%',
                          position: 'relative',
                        }}>
                          <Avatar email={email} size="sm" />
                        </div>
                      ))}
                      {(g.memberEmails || []).length > 3 && (
                        <div style={{
                          marginLeft: -10, zIndex: 0,
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                        }}>
                          +{g.memberEmails.length - 3}
                        </div>
                      )}
                    </div>
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
                  ><Trash2 size={16} /></button>
                </div>
              ))}

              {/* Botón agregar grupo — estilo card con borde punteado */}
              <button
                id="create-group-btn"
                onClick={() => setShowCreateModal(true)}
                style={{
                  width: '100%', padding: '18px', borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--text-muted)', background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Plus size={24} strokeWidth={2} />
              </button>
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
                      <X size={16} />
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
                    {showPassIdx === i ? <EyeOff size={18} /> : <Eye size={18} />}
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
                {deleting ? 'Eliminando...' : <><Trash2 size={14} /> Eliminar</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cambiar contraseña */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} title="Cambiar contraseña" centered>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'error'); return; }
          if (newPassword !== confirmPassword) { toast('Las contraseñas no coinciden', 'error'); return; }
          setChangingPassword(true);
          try {
            await changePassword(user.email, currentPassword, newPassword);
            toast('Contraseña actualizada ✅');
            setShowPasswordModal(false);
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
          } catch (err) {
            toast(err?.message || 'Error al cambiar contraseña', 'error');
          } finally {
            setChangingPassword(false);
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="input-group">
            <label className="input-label">Contraseña actual</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showCurrentPass ? 'text' : 'password'}
                placeholder="Tu contraseña actual" value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)} required
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Nueva contraseña</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showNewPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required minLength={6}
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirmar nueva contraseña</label>
            <input className="input" type={showNewPass ? 'text' : 'password'}
              placeholder="Repite la nueva contraseña" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
            {confirmPassword && newPassword !== confirmPassword && (
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>Las contraseñas no coinciden</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button"
              onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer',
              }}>
              Cancelar
            </button>
            <button type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: 'none',
                background: (changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword) ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
                color: (changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword) ? 'var(--text-muted)' : '#fff',
                fontSize: '0.85rem', fontWeight: 700,
                cursor: changingPassword ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
              }}>
              {changingPassword ? 'Cambiando...' : 'Cambiar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
