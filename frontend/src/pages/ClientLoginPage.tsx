import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { requestOtp, verifyOtp } from '@store/slices/authSlice'
import { useGsapFadeIn } from '@hooks/useGsap'

export default function ClientLoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error, otpSent, otpPhone, devOtpCode } = useAppSelector(s => s.auth)
  const formRef = useGsapFadeIn(0.1)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault()
    await dispatch(requestOtp({ phone: phone.trim() }))
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(verifyOtp({ phone: otpPhone!, code: code.trim() }))
    if (verifyOtp.fulfilled.match(result)) {
      navigate('/')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div ref={formRef} className="w-full max-w-sm space-y-6">

        {!otpSent ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-zinc-100 mb-1">Ingresá a tu perfil</h1>
              <p className="text-zinc-500 text-sm">Ingresá el WhatsApp que usaste al hacer tu reserva y te enviamos un código.</p>
            </div>

            <div className="dark-card p-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="label-dark">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input-dark w-full"
                    placeholder="+54 9 299 521-7901"
                    autoComplete="tel"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || phone.trim().length < 7}
                  className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enviando...' : 'Enviar código →'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold text-zinc-100 mb-1">Código enviado 📲</h1>
              <p className="text-zinc-500 text-sm">
                Te mandamos un código de 6 dígitos al <span className="text-zinc-300">{otpPhone}</span>.
              </p>
            </div>

            <div className="dark-card p-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
                  {error}
                </div>
              )}

              {devOtpCode && (
                <div className="bg-brand-purple/10 border border-brand-purple/30 text-brand-cyan px-4 py-2 rounded-xl mb-4 text-sm font-mono text-center">
                  DEV — código: {devOtpCode}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="label-dark">Código de verificación</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    className="input-dark w-full text-center text-2xl tracking-[0.4em] font-mono"
                    placeholder="------"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verificando...' : 'Ingresar →'}
                </button>
              </form>

              <button
                onClick={() => { setCode(''); dispatch({ type: 'auth/resetOtp' }) }}
                className="w-full text-center text-zinc-500 text-sm mt-3 hover:text-zinc-300 transition-colors"
              >
                ← Cambiar número
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
