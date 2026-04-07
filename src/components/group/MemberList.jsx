// src/components/group/MemberList.jsx
import { Avatar } from '../ui/Avatar';

export function MemberList({ members, memberGroupsMap, nicknames, currentUserEmail, avatarVersion, onEditNickname, onAvatarClick, dn }) {
  return (
    <div className="animate-fade-in">
      <p className="text-xs text-muted" style={{ marginBottom: 10, paddingLeft: 4 }}>
        Toca ✏️ para ponerle un apodo · Los badges muestran grupos en común
      </p>
      <div className="list">
        {members.map((m) => {
          const email       = m.user_email || m.email;
          const nick        = nicknames[email];
          const otherGroups = memberGroupsMap[email] || [];
          const isMe        = email === currentUserEmail;

          return (
            <div key={email} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isMe ? (
                  <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }} onClick={onAvatarClick} title="Personalizar mi avatar">
                    <Avatar key={`av-${email}-${avatarVersion}`} email={email} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', border: '2px solid var(--bg-card)' }}>📷</div>
                  </div>
                ) : (
                  <Avatar key={`av-${email}-${avatarVersion}`} email={email} />
                )}
                <div className="list-item-content">
                  <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {dn(email)}
                    {nick && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>apodo</span>}
                  </div>
                  <div className="list-item-subtitle">{email}</div>
                </div>
                <button className="btn btn-ghost btn-icon" title="Editar apodo"
                  onClick={() => onEditNickname({ email, value: nick || '' })}
                  style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '6px 8px', flexShrink: 0 }}>✏️</button>
              </div>
              {otherGroups.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 52 }}>
                  <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>También en:</span>
                  {otherGroups.map((gName, gIdx) => (
                    <span key={`${gName}-${gIdx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 600 }}>
                      👥 {gName}
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
