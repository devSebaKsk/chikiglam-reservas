import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@store/hooks'
import { register } from '@store/slices/authSlice'
import { useAuth } from '@hooks/useAuth'
import { useGsapFadeIn } from '@hooks/useGsap'
import LoadingSpinner from '@components/ui/LoadingSpinner'

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useAuth()
  const formRef = useGsapFadeIn(0.1)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(register(form))
    if (register.fulfilled.match(result)) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4">
      <div ref={formRef} className="w-full max-w-md">
        <div className="card shadow-xl">
          <h1 className="text-3xl font-display font-bold text-center text-gray-900 mb-2">Crear Cuenta</h1>
          <p className="text-center text-gray-500 mb-8">Únete a ChikiGlam hoy</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Mínimo 8 caracteres" />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 disabled:opacity-70">
              {isLoading ? <LoadingSpinner /> : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
