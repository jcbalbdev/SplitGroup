// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { loginWithPassword, registerUser, resetPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Split, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Download, Share } from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';

// ── Detección de dispositivo ──
function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua);
  const isEdge = /Edge|Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);

  if (isIOS) return { type: 'ios', browser: isSafari ? 'safari' : 'other' };
  if (isAndroid) return { type: 'android', browser: isChrome ? 'chrome' : 'other' };
  return { type: 'desktop', browser: isChrome ? 'chrome' : isEdge ? 'edge' : 'other' };
}

function getDeviceTitle(device) {
  if (device.type === 'ios') return 'Instalar en iPhone';
  if (device.type === 'android') return 'Instalar en Android';
  return 'Instalar en tu computadora';
}

function InstallInstructions({ device }) {
  const stepStyle = {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', borderRadius: 12,
    background: 'rgba(0, 0, 0, 0.03)',
  };
  const numStyle = {
    width: 24, height: 24, borderRadius: 8,
    background: 'var(--text-primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
  };
  const textStyle = { fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 };

  // iOS pero no Safari
  if (device.type === 'ios' && device.browser !== 'safari') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
          Para instalar KiCode necesitas abrir esta página en <strong>Safari</strong>.
        </p>
        <div style={stepStyle}><div style={numStyle}>1</div><span style={textStyle}>Copia la URL de esta página</span></div>
        <div style={stepStyle}><div style={numStyle}>2</div><span style={textStyle}>Ábrela en Safari</span></div>
        <div style={stepStyle}><div style={numStyle}>3</div><span style={textStyle}>Sigue las instrucciones desde ahí</span></div>
      </div>
    );
  }

  // iOS Safari
  if (device.type === 'ios') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={stepStyle}>
          <div style={numStyle}>1</div>
          <div style={textStyle}>Toca el botón de <strong>Compartir</strong> <Share size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> en la barra inferior</div>
        </div>
        <div style={stepStyle}><div style={numStyle}>2</div><span style={textStyle}>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span></div>
        <div style={stepStyle}><div style={numStyle}>3</div><span style={textStyle}>Toca <strong>"Agregar"</strong> para confirmar</span></div>
      </div>
    );
  }

  // Android pero no Chrome
  if (device.type === 'android' && device.browser !== 'chrome') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
          Para instalar KiCode, abre esta página en <strong>Google Chrome</strong>.
        </p>
        <div style={stepStyle}><div style={numStyle}>1</div><span style={textStyle}>Copia la URL de esta página</span></div>
        <div style={stepStyle}><div style={numStyle}>2</div><span style={textStyle}>Ábrela en Chrome</span></div>
        <div style={stepStyle}><div style={numStyle}>3</div><span style={textStyle}>Sigue las instrucciones desde ahí</span></div>
      </div>
    );
  }

  // Android Chrome
  if (device.type === 'android') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={stepStyle}><div style={numStyle}>1</div><div style={textStyle}>Toca el menú <strong>⋮</strong> en la esquina superior derecha</div></div>
        <div style={stepStyle}><div style={numStyle}>2</div><span style={textStyle}>Selecciona <strong>"Agregar a pantalla de inicio"</strong></span></div>
        <div style={stepStyle}><div style={numStyle}>3</div><span style={textStyle}>Toca <strong>"Agregar"</strong> para confirmar</span></div>
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={stepStyle}>
        <div style={numStyle}>1</div>
        <div style={textStyle}>Busca el ícono de instalación <Download size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> en la barra de direcciones</div>
      </div>
      <div style={stepStyle}><div style={numStyle}>2</div><span style={textStyle}>Haz clic en <strong>"Instalar"</strong></span></div>
      <div style={stepStyle}><div style={numStyle}>3</div><span style={textStyle}>La app se abrirá como aplicación independiente</span></div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [mode,      setMode]      = useState('login');
  const [step,      setStep]      = useState('form');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword_] = useState('');
  const [passConf,  setPassConf]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // true por defecto para evitar flash
  const [resetEmail, setResetEmail] = useState('');
  const [resetting,  setResetting]  = useState(false);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginWithPassword(email.trim().toLowerCase(), password);
      login({ email: data.email, name: data.name });
    } catch (err) {
      toast(err.message || 'Email o contraseña incorrectos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== passConf) { toast('Las contraseñas no coinciden', 'error'); return; }
    if (password.length < 6)   { toast('Mínimo 6 caracteres', 'error'); return; }
    setLoading(true);
    try {
      const data = await registerUser(email.trim().toLowerCase(), password);
      if (data.session) {
        login({ email: data.email, name: data.name });
      } else {
        setStep('verify_email');
      }
    } catch (err) {
      toast(err.message || 'Error al crear cuenta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => { setMode('login'); setStep('form'); setResetEmail(''); };
  const device = getDeviceInfo();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetting(true);
    try {
      await resetPassword(resetEmail.trim().toLowerCase());
      setStep('reset_sent');
    } catch (err) {
      toast(err.message || 'Error al enviar el correo', 'error');
    } finally {
      setResetting(false);
    }
  };

  // ── Logo ──
  const Logo = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginBottom:40 }}>
      <img
        src="/logokicoin.png"
        alt="KiCode"
        style={{ width:64, height:64, borderRadius:18, objectFit:'cover' }}
      />
      <span style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
        KiCode
      </span>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // PASO: Confirmar email tras registro
  // ════════════════════════════════════════════════════════════
  if (step === 'verify_email') {
    return (
      <div className="page" style={{ justifyContent:'center', alignItems:'center', minHeight:'100dvh', background:'var(--bg-base)' }}>
        <div className="container animate-slide-up" style={{ padding:'32px 24px', textAlign:'center', maxWidth:400 }}>
          <Logo />
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(0,0,0,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Mail size={32} color="var(--text-primary)" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Revisa tu correo</h1>
          <p style={{ fontSize:'0.9rem', marginBottom:28 }}>
            Enviamos un email de confirmación a{' '}
            <strong>{email}</strong>.
            <br />Haz clic en el enlace para activar tu cuenta.
          </p>
          <button onClick={resetToLogin}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PASO: Formulario de recuperar contraseña
  // ════════════════════════════════════════════════════════════
  if (step === 'forgot_password') {
    return (
      <div className="page" style={{ justifyContent:'center', alignItems:'center', minHeight:'100dvh', background:'var(--bg-base)' }}>
        <div className="container animate-slide-up" style={{ padding:'32px 24px', textAlign:'center', maxWidth:400 }}>
          <Logo />
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(0,0,0,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Lock size={32} color="var(--text-primary)" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Recuperar contraseña</h1>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:24, lineHeight:1.5 }}>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <form onSubmit={handleResetPassword} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="reset-email-input">Email</label>
              <div className="input-icon-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input id="reset-email-input" className="input" type="email"
                  placeholder="tucorreo@ejemplo.com" value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)} required autoFocus />
              </div>
            </div>
            <button type="submit" disabled={resetting}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12,
                border: 'none',
                background: resetting ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
                color: resetting ? 'var(--text-muted)' : '#fff',
                fontSize: '0.95rem', fontWeight: 700,
                cursor: resetting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s ease',
              }}>
              {resetting ? 'Enviando...' : <><Mail size={16} /> Enviar enlace</>}
            </button>
          </form>
          <button onClick={resetToLogin}
            style={{
              width: '100%', marginTop: 12, padding: '12px 20px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PASO: Confirmación de email de recuperación enviado
  // ════════════════════════════════════════════════════════════
  if (step === 'reset_sent') {
    return (
      <div className="page" style={{ justifyContent:'center', alignItems:'center', minHeight:'100dvh', background:'var(--bg-base)' }}>
        <div className="container animate-slide-up" style={{ padding:'32px 24px', textAlign:'center', maxWidth:400 }}>
          <Logo />
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(52,199,89,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Mail size={32} color="var(--success, #34c759)" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>¡Correo enviado!</h1>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:28, lineHeight:1.5 }}>
            Enviamos un enlace de recuperación a{' '}
            <strong style={{ color:'var(--text-primary)' }}>{resetEmail}</strong>.
            <br />Revisa tu bandeja de entrada (y spam) y haz clic en el enlace para crear una nueva contraseña.
          </p>
          <button onClick={resetToLogin}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12,
              border: 'none', background: 'var(--text-primary)', color: '#fff',
              fontSize: '0.88rem', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <ArrowLeft size={16} /> Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // FORMULARIO PRINCIPAL (Login / Registro)
  // ════════════════════════════════════════════════════════════
  return (
    <div className="page" style={{ justifyContent:'center', alignItems:'center', minHeight:'100dvh', background:'var(--bg-base)' }}>
      <div className="container animate-slide-up" style={{ padding:'32px 24px', maxWidth:400 }}>
        <Logo />

        {/* Toggle Login / Registro */}
        <div style={{
          display:'flex', background:'rgba(0, 0, 0, 0.04)', borderRadius:12,
          padding:4, marginBottom:32,
        }}>
          <SegmentedControl
            tabs={[
              { key: 'login', label: 'Iniciar sesión' },
              { key: 'register', label: 'Crear cuenta' },
            ]}
            activeKey={mode}
            onChange={(key) => { setMode(key); setStep('form'); }}
          />
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}
          style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Email */}
          <div className="input-group">
            <label className="input-label" htmlFor="email-input">Email</label>
            <div className="input-icon-wrapper">
              <span className="input-icon"><Mail size={16} /></span>
              <input id="email-input" className="input" type="email"
                placeholder="tucorreo@ejemplo.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
          </div>

          {/* Contraseña */}
          <div className="input-group">
            <label className="input-label" htmlFor="password-input">Contraseña</label>
            <div className="input-icon-wrapper" style={{ position:'relative' }}>
              <span className="input-icon"><Lock size={16} /></span>
              <input id="password-input" className="input"
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                value={password} onChange={e => setPassword_(e.target.value)} required />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  color:'var(--text-muted)', padding:4,
                }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña (solo en registro) */}
          {mode === 'register' && (
            <div className="input-group">
              <label className="input-label" htmlFor="pass-conf-input">Confirmar contraseña</label>
              <div className="input-icon-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="pass-conf-input" className="input" type="password"
                  placeholder="Repite la contraseña"
                  value={passConf} onChange={e => setPassConf(e.target.value)} required />
              </div>
            </div>
          )}

          <button id="auth-submit-btn" type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, marginTop: 4,
              border: 'none',
              background: loading ? 'rgba(0,0,0,0.06)' : 'var(--text-primary)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontSize: '0.95rem', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s ease',
            }}>
            {loading
              ? 'Cargando...'
              : mode === 'login'
                ? <><LogIn size={16} /> Entrar</>
                : <><UserPlus size={16} /> Crear mi cuenta</>}
          </button>

          {/* ── ¿Olvidaste tu contraseña? ── */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setStep('forgot_password'); setResetEmail(email); }}
              style={{
                width: '100%', marginTop: 8, padding: '8px',
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500,
                cursor: 'pointer', textAlign: 'center',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>

        {/* ── Botón instalar PWA ── */}
        {!isInstalled && (
          <button
            onClick={() => setShowInstall(true)}
            style={{
              width: '100%', marginTop: 16, padding: '10px',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Download size={14} /> Instalar KiCode en tu dispositivo
          </button>
        )}
      </div>

      {/* ── Modal instrucciones de instalación ── */}
      <Modal isOpen={showInstall} onClose={() => setShowInstall(false)} centered>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {getDeviceTitle(device)}
          </h3>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 8px',
              background: 'rgba(0, 0, 0, 0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={22} color="var(--text-primary)" />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Sigue estos pasos para instalar la app
            </p>
          </div>

          <InstallInstructions device={device} />

          <button onClick={() => setShowInstall(false)}
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.08)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer',
            }}>
            Entendido
          </button>
        </div>
      </Modal>
    </div>
  );
}
