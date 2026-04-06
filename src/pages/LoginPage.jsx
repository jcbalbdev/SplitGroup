// src/pages/LoginPage.jsx
import { useState } from 'react';
import { sendMagicLink } from '../services/api';
import { useToast } from '../components/ui/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      toast(err.message || 'Error al enviar el link. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✉️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Revisa tu correo</h1>
          <p style={{ marginBottom: 24 }}>
            Enviamos un magic link a <strong style={{ color: 'var(--primary-light)' }}>{email}</strong>.
            Haz clic en el enlace para entrar.
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => setSent(false)}
          >
            Usar otro email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
      {/* Background decorativo */}
      <div
        style={{
          position: 'fixed',
          top: '-20%',
          left: '-20%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(0,210,160,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="container animate-slide-up"
        style={{ position: 'relative', zIndex: 1, padding: '32px 24px' }}
      >
        {/* Logo */}
        <div className="logo" style={{ justifyContent: 'center', marginBottom: 48 }}>
          <div className="logo-icon">💸</div>
          <span className="logo-text">SplitGroup</span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 12, lineHeight: 1.2 }}>
            Gastos compartidos,{' '}
            <span style={{ color: 'var(--primary-light)' }}>sin drama</span>
          </h1>
          <p>Registra gastos grupales y sabe exactamente quién le debe cuánto a quién.</p>
        </div>

        {/* Formulario */}
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="email-input">Tu email</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email-input"
                  className="input"
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              id="send-magic-link-btn"
              type="submit"
              className={`btn btn-primary btn-full ${loading ? 'btn-disabled' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'pulse 1s infinite' }}>⚡</span>
                  Enviando...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Entrar con magic link
                </>
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}
        >
          {[
            { icon: '🔐', text: 'Sin contraseña — solo tu email' },
            { icon: '👥', text: 'Crea grupos y agrega miembros' },
            { icon: '💰', text: 'Calcula quién debe cuánto automáticamente' },
          ].map((f) => (
            <div
              key={f.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
