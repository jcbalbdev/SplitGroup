// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGroups, createGroup, inviteAndCreateMember, deleteGroup, changePassword, setGroupNickname } from '../services/api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonList } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { AvatarPickerModal } from '../components/ui/AvatarPickerModal';
import { useNicknames } from '../context/NicknamesContext';
import { getCached, setCached, clearCached } from '../utils/cache';
import { LogOut, Trash2, Plus, Users, User, Split, X, Eye, EyeOff, KeyRound, Pencil, Camera, Bell } from 'lucide-react';
import { NotificationPanel } from '../components/ui/NotificationPanel';
import { HelpTooltip } from '../components/ui/HelpTooltip';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useNotifications } from '../hooks/useNotifications';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { dn, setOneNickname } = useNicknames();

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
  const [dashTab,             setDashTab]            = useState('groups');
  // Nickname editing
  const [editingNick,      setEditingNick]      = useState(null);
  const [savingNick,       setSavingNick]       = useState(false);
  // Avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarVersion,    setAvatarVersion]    = useState(0);
  // Notificaciones
  const [showNotifications, setShowNotifications] = useState(false);
  const { activity, myRecurring, loading: notifLoading, loaded: notifLoaded, fetch: fetchNotifications } = useNotifications(user?.email);

  // Contar no-vistas: actividad de hoy o recurrentes vencidos
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = notifLoaded ? myRecurring.filter(r => r.next_due_date <= today).length : 0;
  const unreadCount = notifLoaded ? (activity.length > 0 ? activity.length : 0) + overdueCount : 0;

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

  const saveNickname = async () => {
    if (!editingNick) return;
    setSavingNick(true);
    try {
      await setGroupNickname(editingNick.groupId, editingNick.email, editingNick.value.trim());
      setOneNickname(editingNick.email, editingNick.value.trim());
      setEditingNick(null);
      toast('Apodo guardado');
    } catch (err) {
      toast(err.message || 'Error al guardar apodo', 'error');
    } finally {
      setSavingNick(false);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <img src="/logokicoin.png" alt="KiCode" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
            <span className="logo-text">KiCode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Notificaciones */}
            <button
              id="notifications-btn"
              onClick={() => { setShowNotifications(true); fetchNotifications(); }}
              title="Notificaciones"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                transition: 'all 0.2s ease', position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--primary)',
                  border: '1.5px solid var(--bg-primary)',
                }} />
              )}
            </button>
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

      <div className="page-content" style={{ paddingBottom: 60 }}>
        <div className="container">
          {/* Título grande */}
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
              }}>{dashTab === 'groups' ? 'Tus grupos de gastos compartidos' : 'Miembros de tus grupos'}</span>
            </div>
          </div>

          {/* ═══ TAB: GRUPOS ═══ */}
          {dashTab === 'groups' && (
            <>
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
                      marginTop: 16, width: '100%', padding: '18px', borderRadius: 14,
                      border: '2px dashed rgba(0,0,0,0.12)', background: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Plus size={24} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Lista de grupos — contenedor iOS */}
                  <div style={{
                    borderRadius: 16, overflow: 'hidden',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                  }}>
                    {groups.map((g, idx) => (
                      <div
                        key={g.group_id}
                        id={`group-${g.group_id}`}
                        style={{
                          padding: '14px 16px',
                          borderBottom: idx < groups.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                          display: 'flex', alignItems: 'center',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
                          onClick={() => navigate(`/group/${g.group_id}`)}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/group/${g.group_id}`)}
                          role="button" tabIndex={0}>
                          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            {(g.memberEmails || []).slice(0, 3).map((email, i) => (
                              <div key={email} style={{
                                marginLeft: i === 0 ? 0 : -10,
                                zIndex: 3 - i,
                                borderRadius: '50%', position: 'relative',
                              }}>
                                <Avatar email={email} size="sm" />
                              </div>
                            ))}
                            {(g.memberEmails || []).length > 3 && (
                              <div style={{
                                marginLeft: -10, zIndex: 0,
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'var(--text-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                              }}>
                                +{g.memberEmails.length - 3}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{g.memberCount || 0} miembros</div>
                          </div>
                        </div>
                        <button
                          title="Eliminar grupo"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ group_id: g.group_id, name: g.name }); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                            flexShrink: 0, transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                        ><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Botón agregar grupo */}
                  <button
                    id="create-group-btn"
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      width: '100%', padding: '18px', borderRadius: 14,
                      border: '2px dashed rgba(0,0,0,0.12)', background: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Plus size={24} strokeWidth={2} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ═══ TAB: MIEMBROS ═══ */}
          {dashTab === 'members' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {loading ? (
                <SkeletonList count={3} />
              ) : groups.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={48} strokeWidth={1.5} /></div>
                  <div className="empty-state-title">Sin miembros</div>
                  <div className="empty-state-text">Crea un grupo para ver los miembros</div>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.group_id}>
                    {/* Sección header */}
                    <div style={{
                      fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      paddingLeft: 4, marginBottom: 8,
                    }}>
                      Miembros de {g.name}
                    </div>
                    <p style={{
                      marginBottom: 10, paddingLeft: 4,
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
                    }}>
                      Toca <Pencil size={11} /> para ponerle un apodo
                    </p>
                    {/* Lista iOS */}
                    <div style={{
                      borderRadius: 16, overflow: 'hidden',
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                    }}>
                      {(g.memberEmails || []).map((email, idx, arr) => {
                        const isMe = email === user?.email;
                        const nick = dn(email) !== email.split('@')[0] ? dn(email) : null;
                        return (
                          <div key={email} style={{
                            padding: '14px 16px',
                            borderBottom: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 12,
                          }}>
                            {/* Avatar */}
                            {isMe ? (
                              <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                                onClick={() => setShowAvatarPicker(true)} title="Personalizar mi avatar">
                                <Avatar key={`av-${email}-${avatarVersion}`} email={email} />
                                <div style={{
                                  position: 'absolute', bottom: -2, right: -2,
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: 'var(--text-primary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '2px solid var(--bg-card)',
                                }}>
                                  <Camera size={10} color="#fff" />
                                </div>
                              </div>
                            ) : (
                              <Avatar key={`av-${email}-${avatarVersion}`} email={email} />
                            )}

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {dn(email)}
                                </span>
                                {nick && (
                                  <span style={{
                                    fontSize: '0.62rem', color: 'var(--text-muted)',
                                    background: 'rgba(0, 0, 0, 0.04)',
                                    padding: '1px 7px', borderRadius: 6, fontWeight: 600,
                                  }}>apodo</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {email}
                              </div>
                            </div>

                            {/* Pencil */}
                            <button
                              onClick={() => setEditingNick({ email, value: nick || '', groupId: g.group_id })}
                              title="Editar apodo"
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: 6, borderRadius: 8, color: 'var(--text-muted)',
                                flexShrink: 0, transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {/* Tab bar fijo abajo — estilo pill como GroupPage */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(245, 245, 247, 0.9)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          zIndex: 100, padding: '10px 16px 14px',
        }}>
          <div style={{
            display: 'flex', maxWidth: 480, margin: '0 auto',
            background: 'rgba(0, 0, 0, 0.04)', borderRadius: 14, padding: 4,
          }}>
            <SegmentedControl
              tabs={[
                { key: 'groups', label: 'Grupos' },
                { key: 'members', label: 'Miembros' },
              ]}
              activeKey={dashTab}
              onChange={setDashTab}
            />
          </div>
        </div>
      </div>

      {/* Modal crear grupo */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo grupo"
        titleHelper={
          <HelpTooltip
            text="Un grupo reúne a las personas con las que compartes gastos. Puedes tener varios: uno para casa, otro para viajes, etc."
            position="bottom"
          />
        }
        centered
        fullscreen
      >
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
          {(() => {
            const hasMembersAdded = members.some((m) => m.email.trim() !== '');
            return (
              <div className="input-group">
                <label className="input-label">Miembros</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                  Agrega a las personas con las que compartirás gastos. Se creará una cuenta para cada uno.
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

                {/* Hint dinámico */}
                {!hasMembersAdded && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    background: 'rgba(255, 149, 0, 0.06)',
                    border: '1px solid rgba(255, 149, 0, 0.12)',
                    marginTop: 4,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    <User size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Sin miembros, se creará un registro de <strong style={{ color: 'var(--text-primary)' }}>gastos individuales</strong> solo para ti.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => setShowCreateModal(false)}>
              Cancelar
            </button>
            <button id="confirm-create-group-btn" type="submit"
              className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
              {creating ? 'Creando...' : members.some((m) => m.email.trim()) ? 'Crear grupo' : 'Crear registro'}
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

      {/* Avatar picker */}
      <AvatarPickerModal isOpen={showAvatarPicker} onClose={() => setShowAvatarPicker(false)}
        email={user?.email || ''} onSaved={() => setAvatarVersion((v) => v + 1)} />

      {/* Modal editar apodo */}
      <Modal isOpen={!!editingNick} onClose={() => setEditingNick(null)} title="Editar apodo" centered>
        {editingNick && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>{editingNick.email}</div>
            <div className="input-group">
              <label className="input-label" htmlFor="dash-nickname-input">Apodo (visible para todos)</label>
              <input id="dash-nickname-input" className="input" type="text"
                placeholder={editingNick.email.split('@')[0]}
                value={editingNick.value} maxLength={20}
                onChange={(e) => setEditingNick((prev) => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                autoFocus />
            </div>
            {editingNick.value.trim() && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>
                Se mostrará como <strong style={{ color: 'var(--text-primary)' }}>{editingNick.value.trim()}</strong> para todos
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditingNick((p) => ({ ...p, value: '' }))}
                disabled={savingNick || !editingNick.value}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
                  color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', opacity: editingNick.value ? 1 : 0.4,
                }}>
                Quitar apodo
              </button>
              <button
                onClick={saveNickname}
                disabled={savingNick || (!editingNick.value.trim())}
                style={{
                  flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                  background: (!editingNick.value.trim()) ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
                  color: (!editingNick.value.trim()) ? 'var(--text-muted)' : '#fff',
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: savingNick ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                {savingNick ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Notificaciones */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        activity={activity}
        myRecurring={myRecurring}
        loading={notifLoading}
        loaded={notifLoaded}
        onRefresh={fetchNotifications}
        onNavigate={(groupId) => {
          setShowNotifications(false);
          if (groupId) navigate(`/group/${groupId}`);
        }}
      />
    </div>
  );
}
