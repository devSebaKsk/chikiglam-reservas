import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@store/hooks'
import { login } from '@store/slices/authSlice'
import { useAuth } from '@hooks/useAuth'
import { useGsapFadeIn } from '@hooks/useGsap'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useAuth()
  const formRef = useGsapFadeIn(0.1)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login(form))
    if (login.fulfilled.match(result)) {
      const role = result.payload.user.role
      if (role === 'superadmin' || role === 'admin' || role === 'employee' || role === 'organizer') {
        navigate('/admin')
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div ref={formRef} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold gradient-text mb-2">ChikiGlam</h1>
          <p className="text-zinc-500 text-sm">Panel de staff</p>
        </div>

        <div className="dark-card p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-dark">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-dark w-full"
                placeholder="admin@chikiglam.com"
              />
            </div>
            <div>
              <label className="label-dark">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-dark w-full pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-brand w-full mt-2 disabled:opacity-50"
            >
              {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
