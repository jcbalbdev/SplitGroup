// src/pages/LoginPage.jsx
import { useState, useRef, useEffect } from 'react';
import { sendMagicLink, verifyToken, loginWithPassword, registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Split, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, RefreshCw, ShieldCheck, Zap, Users, Wallet, KeyRound, Hash } from 'lucide-react';

// Modos: 'login' | 'register' | 'otp_email' | 'otp_code' | 'verify_email'
export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [mode,      setMode]      = useState('login'); // login | register
  const [step,      setStep]      = useState('form');  // form | otp_code | verify_email
  const [email,     setEmail]     = useState('');
  const [password,  setPassword_] = useState('');
  const [passConf,  setPassConf]  = useState('');
  const [otp,       setOtp]       = useState(['', '', '', '', '', '']);
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputsRef = useRef([]);

  // Countdown reenvío OTP
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

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
        // Confirm email desactivado → sesión inmediata → entrar directo
        login({ email: data.email, name: data.name });
      } else {
        // Confirm email activado → esperar verificación
        setStep('verify_email');
      }
    } catch (err) {
      toast(err.message || 'Error al crear cuenta', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar código OTP ────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setStep('otp_code');
      setOtp(['', '', '', '', '', '']);
      setResendTimer(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      toast(err.message || 'Error al enviar el código', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar OTP ────────────────────────────────────────────
  const handleVerifyOtp = async (code) => {
    const full = code || otp.join('');
    if (full.length < 6) return;
    setLoading(true);
    try {
      const data = await verifyToken(email.trim().toLowerCase(), full);
      login({ email: data.email, name: data.name });
    } catch (err) {
      toast(err.message || 'Código incorrecto', 'error');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ───────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (next.every(d => d !== '')) handleVerifyOtp(next.join(''));
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); handleVerifyOtp(p); }
  };

  const resetToLogin = () => { setMode('login'); setStep('form'); setOtp(['','','','','','']); };

  // ── Fondo decorativo ─────────────────────────────────────────
  const Bg = () => (
    <>
      <div style={{ position:'fixed', top:'-20%', left:'-20%', width:'60%', height:'60%',
        background:'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)',
        pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-10%', width:'50%', height:'50%',
        background:'radial-gradient(circle, rgba(0,210,160,0.08) 0%, transparent 70%)',
        pointerEvents:'none', zIndex:0 }} />
    </>
  );

  const Logo = () => (
    <div className="logo" style={{ justifyContent:'center', marginBottom:36 }}>
      <div className="logo-icon"><Split size={20} /></div>
      <span className="logo-text">SplitGroup</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // PASO: Confirmar email tras registro
  // ════════════════════════════════════════════════════════════
  if (step === 'verify_email') {
    return (
      <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
        <Bg />
        <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px', textAlign:'center' }}>
          <Logo />
          <div style={{ fontSize:'3rem', marginBottom:16 }}><Mail size={48} strokeWidth={1.5} /></div>
          <h1 style={{ fontSize:'1.5rem', marginBottom:12 }}>Revisa tu correo</h1>
          <p style={{ color:'var(--text-secondary)', marginBottom:24 }}>
            Enviamos un email de confirmación a{' '}
            <strong style={{ color:'var(--primary-light)' }}>{email}</strong>.
            <br />Haz clic en el enlace para activar tu cuenta.
          </p>
          <button className="btn btn-ghost btn-full" onClick={resetToLogin}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PASO: Ingresar código OTP
  // ════════════════════════════════════════════════════════════
  if (step === 'otp_code') {
    return (
      <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
        <Bg />
        <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
          <Logo />
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}><ShieldCheck size={42} strokeWidth={1.5} /></div>
            <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Código enviado</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
              Revisa el correo de <strong style={{ color:'var(--primary-light)' }}>{email}</strong>
            </p>
          </div>
          <div className="card" style={{ marginBottom:12 }}>
            <div onPaste={handleOtpPaste} style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20 }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => inputsRef.current[i] = el} id={`otp-${i}`}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{ width:46, height:56, textAlign:'center', fontSize:'1.5rem',
                    fontWeight:700, fontFamily:'monospace', background:'var(--bg-card)',
                    border:`2px solid ${digit ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius:10, color:'var(--text-primary)', outline:'none',
                    transition:'border-color 0.2s' }} />
              ))}
            </div>
            <button id="verify-otp-btn"
              className={`btn btn-primary btn-full ${(loading || otp.join('').length < 6) ? 'btn-disabled':''}`}
              disabled={loading || otp.join('').length < 6} onClick={() => handleVerifyOtp()}>
              {loading ? <><Zap size={14} /> Verificando...</> : <><ShieldCheck size={14} /> Verificar código</>}
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <button className="btn btn-ghost" disabled={resendTimer > 0} onClick={handleSendOtp}>
              {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : <><RefreshCw size={14} /> Reenviar código</>}
            </button>
            <button className="btn btn-ghost" onClick={resetToLogin}><ArrowLeft size={14} /> Volver</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // FORMULARIO PRINCIPAL (Login / Registro)
  // ════════════════════════════════════════════════════════════
  return (
    <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
      <Bg />
      <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
        <Logo />

        {/* Toggle Login / Registro */}
        <div style={{ display:'flex', background:'var(--bg-card)', borderRadius:12,
          padding:4, marginBottom:28, border:'1px solid var(--border)' }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setStep('form'); }}
              style={{ flex:1, padding:'10px 0', borderRadius:10, fontWeight:600,
                fontSize:'0.9rem', border:'none', cursor:'pointer', transition:'all 0.2s',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-secondary)' }}>
              {m === 'login' ? <><LogIn size={14} /> Iniciar sesión</> : <><UserPlus size={14} /> Crear cuenta</>}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}
            style={{ display:'flex', flexDirection:'column', gap:14 }}>

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
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'var(--text-secondary)', fontSize:'1rem' }}>
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
              disabled={loading}>
              {loading
                ? <><Zap size={14} /> Cargando...</>
                : mode === 'login' ? <><LogIn size={14} /> Entrar</> : <><UserPlus size={14} /> Crear mi cuenta</>}
            </button>
          </form>
        </div>

        {/* Opción código OTP */}
        <div style={{ textAlign:'center', marginTop:8 }}>
          <button className="btn btn-ghost" style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}
            onClick={() => { setMode('login'); handleSendOtp(); }}>
            <Hash size={14} /> Entrar con código de un solo uso
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:28 }}>
          {[
            { icon: Zap, text:'Entra con contraseña — rápido y sin emails' },
            { icon: Users, text:'Invita a amigos y compartan gastos' },
            { icon: Wallet, text:'Calcula quién debe cuánto automáticamente' },
          ].map(f => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12,
              color:'var(--text-secondary)', fontSize:'0.85rem' }}>
              <f.icon size={18} style={{ flexShrink: 0 }} />
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
