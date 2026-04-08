// src/components/group/MemberList.jsx
// Lista de miembros — estilo iOS minimalista
import { Avatar } from '../ui/Avatar';
import { Pencil, Camera, Users } from 'lucide-react';

export function MemberList({ members, memberGroupsMap, nicknames, currentUserEmail, avatarVersion, onEditNickname, onAvatarClick, dn }) {
  return (
    <div className="animate-fade-in">
      <p style={{
        marginBottom: 10, paddingLeft: 4,
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
      }}>
        Toca <Pencil size={11} /> para ponerle un apodo
      </p>

      {/* Contenedor único redondeado */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--bg-card)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
      }}>
        {members.map((m, idx) => {
          const email       = m.user_email || m.email;
          const nick        = nicknames[email];
          const otherGroups = memberGroupsMap[email] || [];
          const isMe        = email === currentUserEmail;
          const isLast      = idx === members.length - 1;

          return (
            <div key={email} style={{
              padding: '14px 16px',
              borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
              transition: 'background 0.15s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                {isMe ? (
                  <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={onAvatarClick} title="Personalizar mi avatar">
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

                {/* Edit button */}
                <button
                  onClick={() => onEditNickname({ email, value: nick || '' })}
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

              {/* Grupos en común */}
              {otherGroups.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 52, marginTop: 8 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>También en:</span>
                  {otherGroups.map((gName, gIdx) => (
                    <span key={`${gName}-${gIdx}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 8px', borderRadius: 6,
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.68rem', fontWeight: 600,
                    }}>
                      <Users size={10} /> {gName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
