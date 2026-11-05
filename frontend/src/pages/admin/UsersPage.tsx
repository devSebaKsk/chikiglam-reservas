import { useEffect, useState } from 'react'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAuth } from '@hooks/useAuth'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { ROLE_LABELS, ROLE_BADGE_STYLES, assignableRoles, canManage } from '@utils/roles'
import api from '@services/api'
import type { UserRole } from '@/types'

interface AdminUser {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: UserRole
  is_active: number
  created_at: string
}

interface CreateForm {
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
}

const DISPLAYED_ROLES: UserRole[] = ['superadmin', 'admin', 'organizer', 'employee', 'client', 'guest']

export default function UsersPage() {
  const ref = useGsapFadeIn()
  const { user: me } = useAuth()
  const dispatch = useAppDispatch()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | ''>('')

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: '', email: '', password: '', phone: '', role: 'organizer',
  })

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const myRole = me?.role as UserRole ?? 'admin'
  const canAssign = assignableRoles(myRole)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRole) params.set('role', filterRole)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '50')
      const res = await api.get(`/users?${params}`)
      setUsers((res.data as { data: { users: AdminUser[] } }).data.users)
    } catch {
      dispatch(addToast({ message: 'Error al cargar usuarios', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [filterRole])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role: form.role,
      })
      dispatch(addToast({ message: 'Usuario creado exitosamente', type: 'success' }))
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', phone: '', role: 'organizer' })
      fetchUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear usuario'
      dispatch(addToast({ message: msg, type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (user: AdminUser) => {
    setTogglingId(user.id)
    try {
      if (user.is_active) {
        await api.delete(`/users/${user.id}`)
        dispatch(addToast({ message: 'Usuario desactivado', type: 'success' }))
      } else {
        await api.patch(`/users/${user.id}/activate`, {})
        dispatch(addToast({ message: 'Usuario reactivado', type: 'success' }))
      }
      setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: user.is_active ? 0 : 1 } : u))
    } catch {
      dispatch(addToast({ message: 'Error al actualizar usuario', type: 'error' }))
    } finally {
      setTogglingId(null)
    }
  }

  // ─── Vista: formulario de creación ───────────────────────────────────────────
  if (showCreate) {
    return (
      <div ref={ref} className="px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(false)}
            className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"
          >
            ‹
          </button>
          <h1 className="text-xl font-display font-bold text-zinc-100">Nuevo usuario</h1>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="dark-card p-4 space-y-3">
            <div>
              <label className="label-dark">Nombre *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="input-dark w-full"
                placeholder="Nombre completo"
                required
              />
            </div>
            <div>
              <label className="label-dark">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-dark w-full"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div>
              <label className="label-dark">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-dark w-full pr-10"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
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
            <div>
              <label className="label-dark">Teléfono (opcional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input-dark w-full"
                placeholder="+54 9 299..."
              />
            </div>
            <div>
              <label className="label-dark">Rol *</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                className="input-dark w-full"
              >
                {canAssign.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn-brand w-full disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </div>
    )
  }

  // ─── Vista: listado de usuarios ───────────────────────────────────────────────
  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Usuarios</h1>
        <button onClick={() => setShowCreate(true)} className="btn-brand text-sm px-4 py-2">
          + Nuevo
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-dark flex-1 text-sm"
          placeholder="Buscar por nombre o email..."
        />
        <button type="submit" className="px-3 py-2 rounded-xl bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600 transition-colors">
          Buscar
        </button>
      </form>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilterRole('')}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
            filterRole === '' ? 'border-brand-pink text-brand-pink' : 'border-zinc-700 text-zinc-500'
          }`}
        >
          Todos
        </button>
        {DISPLAYED_ROLES.map(r => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterRole === r ? 'border-brand-pink text-brand-pink' : 'border-zinc-700 text-zinc-500'
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-zinc-500 text-sm">No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const isSelf = u.id === me?.id
            const canAct = !isSelf && canManage(myRole, u.role)
            return (
              <div key={u.id} className={`dark-card p-4 ${!u.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-zinc-100 font-medium text-sm">{u.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE_STYLES[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                      {!u.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-500">Inactivo</span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{u.email ?? u.phone ?? '—'}</p>
                  </div>
                  {canAct && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={togglingId === u.id}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                        u.is_active
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      } disabled:opacity-40`}
                    >
                      {togglingId === u.id ? '...' : u.is_active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
