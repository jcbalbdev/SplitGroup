// src/pages/LoginPage.jsx
import { useState, useRef, useEffect } from 'react';
import { sendMagicLink, verifyToken, loginWithPassword, setPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

// Pasos: 'password' | 'otp_email' | 'otp_code' | 'set_password'
export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [step,          setStep]          = useState('password');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword_]     = useState('');
  const [otp,           setOtp]           = useState(['', '', '', '', '', '']);
  const [newPass,       setNewPass]       = useState('');
  const [newPassConf,   setNewPassConf]   = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [resendTimer,   setResendTimer]   = useState(0);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const inputsRef = useRef([]);

  // Countdown reenvío OTP
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Login con contraseña ─────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await loginWithPassword(email.trim().toLowerCase(), password);
      login({ email: data.email, name: data.name });
    } catch (err) {
      // Si el error es que no tiene contraseña, llevar al flujo OTP
      if (err.message?.includes('Sin contrasena') || err.message?.includes('no encontrado')) {
        toast('No tienes contraseña configurada. Usa el código por email.', 'info');
        setStep('otp_email');
      } else {
        toast(err.message || 'Contraseña incorrecta', 'error');
      }
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
      const data = await verifyToken(full);
      setVerifiedEmail(data.email);
      // Preguntamos si quiere crear contraseña
      login({ email: data.email, name: data.name });
      setStep('set_password');
    } catch (err) {
      toast(err.message || 'Código incorrecto', 'error');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── Establecer contraseña ────────────────────────────────────
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPass !== newPassConf) { toast('Las contraseñas no coinciden', 'error'); return; }
    setLoading(true);
    try {
      await setPassword(verifiedEmail || email, newPass);
      toast('¡Contraseña guardada! Ya puedes entrar con ella 🎉');
      // La sesión ya está activa (login se llamó en handleVerifyOtp)
    } catch (err) {
      toast(err.message || 'Error al guardar contraseña', 'error');
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
    if (next.every((d) => d !== '')) handleVerifyOtp(next.join(''));
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setOtp(p.split('')); handleVerifyOtp(p); }
  };

  // ── Decoración de fondo ──────────────────────────────────────
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
    <div className="logo" style={{ justifyContent:'center', marginBottom:40 }}>
      <div className="logo-icon">💸</div>
      <span className="logo-text">SplitGroup</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // PASO: Configurar contraseña (tras verificar OTP por primera vez)
  // ════════════════════════════════════════════════════════════
  if (step === 'set_password') {
    return (
      <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
        <Bg />
        <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
          <Logo />
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🔑</div>
            <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Crea tu contraseña</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
              Para la próxima vez entra directo sin necesitar un código
            </p>
          </div>

          <div className="card" style={{ marginBottom:12 }}>
            <form onSubmit={handleSetPassword} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="new-pass">Nueva contraseña</label>
                <input id="new-pass" className="input" type="password" placeholder="Mínimo 6 caracteres"
                  value={newPass} onChange={(e) => setNewPass(e.target.value)} required autoFocus />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="new-pass-conf">Confirmar contraseña</label>
                <input id="new-pass-conf" className="input" type="password" placeholder="Repite la contraseña"
                  value={newPassConf} onChange={(e) => setNewPassConf(e.target.value)} required />
              </div>
              <button id="save-password-btn" type="submit" className={`btn btn-primary btn-full ${loading ? 'btn-disabled':''}`}
                disabled={loading || newPass.length < 6}>
                {loading ? '⚡ Guardando...' : '✅ Guardar contraseña'}
              </button>
            </form>
          </div>
          <button className="btn btn-ghost btn-full" onClick={() => setStep('password')}>
            Omitir por ahora →
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
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>📱</div>
            <h1 style={{ fontSize:'1.4rem', marginBottom:8 }}>Revisa tu correo</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
              Código enviado a <strong style={{ color:'var(--primary-light)' }}>{email}</strong>
            </p>
          </div>

          <div className="card" style={{ marginBottom:12 }}>
            <div onPaste={handleOtpPaste} style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20 }}>
              {otp.map((digit, i) => (
                <input key={i} ref={(el) => (inputsRef.current[i] = el)} id={`otp-${i}`}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{ width:46, height:56, textAlign:'center', fontSize:'1.5rem',
                    fontWeight:700, fontFamily:'monospace', background:'var(--bg-card)',
                    border:`2px solid ${digit ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius:10, color:'var(--text-primary)', outline:'none',
                    transition:'border-color 0.2s', caretColor:'var(--primary)' }} />
              ))}
            </div>
            <button id="verify-otp-btn" className={`btn btn-primary btn-full ${loading||otp.join('').length<6?'btn-disabled':''}`}
              disabled={loading || otp.join('').length < 6} onClick={() => handleVerifyOtp()}>
              {loading ? '⚡ Verificando...' : '✅ Verificar código'}
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <button className="btn btn-ghost" disabled={resendTimer > 0} onClick={handleSendOtp}>
              {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : '🔄 Reenviar código'}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('otp_email')}>← Cambiar email</button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PASO: Enviar código por email (sin contraseña)
  // ════════════════════════════════════════════════════════════
  if (step === 'otp_email') {
    return (
      <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
        <Bg />
        <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
          <Logo />
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <h1 style={{ fontSize:'1.5rem', marginBottom:8 }}>Acceso por código</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
              Te enviaremos un código de 6 dígitos a tu correo
            </p>
          </div>

          <div className="card" style={{ marginBottom:12 }}>
            <form onSubmit={handleSendOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="input-group">
                <label className="input-label" htmlFor="email-otp-input">Tu email</label>
                <div className="input-icon-wrapper">
                  <span className="input-icon">✉</span>
                  <input id="email-otp-input" className="input" type="email" placeholder="tucorreo@ejemplo.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <button type="submit" className={`btn btn-primary btn-full ${loading?'btn-disabled':''}`} disabled={loading}>
                {loading ? '⚡ Enviando...' : '📨 Enviar código'}
              </button>
            </form>
          </div>
          <button className="btn btn-ghost btn-full" onClick={() => setStep('password')}>
            ← Volver al login
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PASO PRINCIPAL: Email + Contraseña
  // ════════════════════════════════════════════════════════════
  return (
    <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
      <Bg />
      <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
        <Logo />

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <h1 style={{ fontSize:'1.8rem', marginBottom:10, lineHeight:1.2 }}>
            Gastos compartidos,{' '}
            <span style={{ color:'var(--primary-light)' }}>sin drama</span>
          </h1>
          <p style={{ color:'var(--text-secondary)' }}>Registra gastos grupales y sabe exactamente quién debe cuánto.</p>
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <form onSubmit={handlePasswordLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="email-input">Email</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">✉</span>
                <input id="email-input" className="input" type="email" placeholder="tucorreo@ejemplo.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password-input">Contraseña</label>
              <div className="input-icon-wrapper">
                <span className="input-icon">🔒</span>
                <input id="password-input" className="input" type={showPass ? 'text' : 'password'}
                  placeholder="Tu contraseña" value={password}
                  onChange={(e) => setPassword_(e.target.value)} required />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', fontSize:'1rem' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button id="login-btn" type="submit"
              className={`btn btn-primary btn-full ${loading ? 'btn-disabled':''}`} disabled={loading}>
              {loading ? '⚡ Entrando...' : '✨ Entrar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center' }}>
          <button className="btn btn-ghost" style={{ fontSize:'0.85rem' }}
            onClick={() => { setStep('otp_email'); }}>
            🔢 No tengo contraseña — entrar con código
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:32 }}>
          {[
            { icon:'⚡', text:'Entra con contraseña — sin esperar emails' },
            { icon:'👥', text:'Crea grupos y agrega miembros' },
            { icon:'💰', text:'Calcula quién debe cuánto automáticamente' },
          ].map((f) => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12,
              color:'var(--text-secondary)', fontSize:'0.85rem' }}>
              <span style={{ fontSize:'1.1rem' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
