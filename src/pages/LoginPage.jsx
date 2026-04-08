// src/pages/LoginPage.jsx
import { useState } from 'react';
import { loginWithPassword, registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Split, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

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

  // ── Login con contraseña ─────────────────────────────────────
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

  // ── Registro con contraseña ──────────────────────────────────
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

  const resetToLogin = () => { setMode('login'); setStep('form'); };

  // ── Logo ──────────────────────────────────────────────────────
  const Logo = () => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginBottom:40 }}>
      <div style={{
        width:52, height:52, borderRadius:14,
        background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 4px 16px var(--primary-glow)',
      }}>
        <Split size={26} color="#fff" strokeWidth={2.5} />
      </div>
      <span style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.01em' }}>
        SplitGroup
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
          <div style={{ width:64, height:64, borderRadius:16, background:'var(--primary-glow)',
            display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Mail size={32} color="var(--primary)" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Revisa tu correo</h1>
          <p style={{ fontSize:'0.9rem', marginBottom:28 }}>
            Enviamos un email de confirmación a{' '}
            <strong style={{ color:'var(--primary)' }}>{email}</strong>.
            <br />Haz clic en el enlace para activar tu cuenta.
          </p>
          <button className="btn btn-secondary btn-full" onClick={resetToLogin}
            style={{ borderRadius:12, padding:'14px 20px' }}>
            <ArrowLeft size={16} /> Volver al inicio
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
          display:'flex', background:'var(--bg-input)', borderRadius:12,
          padding:4, marginBottom:32,
        }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setStep('form'); }}
              style={{
                flex:1, padding:'11px 0', borderRadius:10, fontWeight:700,
                fontSize:'0.88rem', border:'none', cursor:'pointer', transition:'all 0.2s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          ))}
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

          <button id="auth-submit-btn" type="submit"
            className={`btn btn-primary btn-full ${loading ? 'btn-disabled':''}`}
            disabled={loading}
            style={{ borderRadius:12, padding:'14px 20px', marginTop:4, fontSize:'0.95rem' }}>
            {loading
              ? 'Cargando...'
              : mode === 'login'
                ? <><LogIn size={16} /> Entrar</>
                : <><UserPlus size={16} /> Crear mi cuenta</>}
          </button>
        </form>
      </div>
    </div>
  );
}
