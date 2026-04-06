// src/pages/LoginPage.jsx
import { useState, useRef, useEffect } from 'react';
import { sendMagicLink, verifyToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [step,    setStep]    = useState('email'); // 'email' | 'otp'
  const [email,   setEmail]   = useState('');
  const [otp,     setOtp]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputsRef = useRef([]);

  // Countdown para reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Step 1: enviar código ────────────────────────────────────
  const handleSendCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setStep('otp');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      toast(err.message || 'Error al enviar el código. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verificar código ─────────────────────────────────
  const handleVerify = async (code) => {
    const fullCode = code || otp.join('');
    if (fullCode.length < 6) return;
    setLoading(true);
    try {
      const data = await verifyToken(fullCode);
      login({ email: data.email, name: data.name });
    } catch (err) {
      toast(err.message || 'Código incorrecto. Intenta de nuevo.', 'error');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ───────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return; // solo números
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.join('').length === 6) handleVerify();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      handleVerify(pasted);
    }
  };

  // ── Background decorativo ────────────────────────────────────
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

  // ── STEP: Ingresa el código ──────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
        <Bg />
        <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
          <div className="logo" style={{ justifyContent:'center', marginBottom:48 }}>
            <div className="logo-icon">💸</div>
            <span className="logo-text">SplitGroup</span>
          </div>

          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>📱</div>
            <h1 style={{ fontSize:'1.5rem', marginBottom:8 }}>Revisa tu correo</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
              Enviamos un código de 6 dígitos a{' '}
              <strong style={{ color:'var(--primary-light)' }}>{email}</strong>
            </p>
          </div>

          {/* OTP inputs */}
          <div className="card" style={{ marginBottom:16 }}>
            <div onPaste={handleOtpPaste} style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:24 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  id={`otp-input-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{
                    width: 46, height: 56,
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    background: 'var(--bg-card)',
                    border: `2px solid ${digit ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    caretColor: 'var(--primary)',
                  }}
                />
              ))}
            </div>

            <button
              id="verify-otp-btn"
              className={`btn btn-primary btn-full ${loading ? 'btn-disabled' : ''}`}
              disabled={loading || otp.join('').length < 6}
              onClick={() => handleVerify()}
            >
              {loading ? (
                <><span style={{ animation:'pulse 1s infinite' }}>⚡</span> Verificando...</>
              ) : (
                <><span>✅</span> Verificar código</>
              )}
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <button
              className="btn btn-ghost"
              disabled={resendCooldown > 0}
              onClick={handleSendCode}
            >
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '🔄 Reenviar código'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setStep('email'); setOtp(['','','','','','']); }}>
              ← Cambiar email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: Ingresa tu email ───────────────────────────────────
  return (
    <div className="page" style={{ justifyContent:'center', minHeight:'100dvh' }}>
      <Bg />
      <div className="container animate-slide-up" style={{ position:'relative', zIndex:1, padding:'32px 24px' }}>
        <div className="logo" style={{ justifyContent:'center', marginBottom:48 }}>
          <div className="logo-icon">💸</div>
          <span className="logo-text">SplitGroup</span>
        </div>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h1 style={{ fontSize:'1.8rem', marginBottom:12, lineHeight:1.2 }}>
            Gastos compartidos,{' '}
            <span style={{ color:'var(--primary-light)' }}>sin drama</span>
          </h1>
          <p>Registra gastos grupales y sabe exactamente quién le debe cuánto a quién.</p>
        </div>

        <div className="card" style={{ marginBottom:16 }}>
          <form onSubmit={handleSendCode} style={{ display:'flex', flexDirection:'column', gap:16 }}>
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
              id="send-otp-btn"
              type="submit"
              className={`btn btn-primary btn-full ${loading ? 'btn-disabled' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <><span style={{ animation:'pulse 1s infinite' }}>⚡</span> Enviando...</>
              ) : (
                <><span>✨</span> Enviar código de acceso</>
              )}
            </button>
          </form>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:32 }}>
          {[
            { icon:'🔐', text:'Sin contraseña — solo tu email + código' },
            { icon:'👥', text:'Crea grupos y agrega miembros' },
            { icon:'💰', text:'Calcula quién debe cuánto automáticamente' },
          ].map((f) => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12, color:'var(--text-secondary)', fontSize:'0.85rem' }}>
              <span style={{ fontSize:'1.1rem' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
