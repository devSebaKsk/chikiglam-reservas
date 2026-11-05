import { useEffect, useState } from 'react'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { settingService } from '@services/settingService'

export default function AdminSettingsPage() {
  const dispatch = useAppDispatch()
  const [alias, setAlias] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const ref = useGsapFadeIn()

  useEffect(() => {
    settingService.getAll().then(all => {
      setAlias(all['payment_alias'] ?? '')
      setInstructions(all['payment_instructions'] ?? '')
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        settingService.set('payment_alias', alias),
        settingService.set('payment_instructions', instructions),
      ])
      dispatch(addToast({ message: 'Configuración guardada', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="px-4 py-6 space-y-3"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-32 rounded-2xl" /></div>
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-5">
      <h1 className="text-xl font-display font-bold text-zinc-100">Configuración</h1>

      <div className="dark-card p-4 space-y-4">
        <h3 className="text-zinc-100 font-semibold text-sm">Datos de pago</h3>
        <div>
          <label className="label-dark">Alias / CBU</label>
          <input
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="ej: chikiglam.mp"
            className="input-dark w-full font-mono"
          />
        </div>
        <div>
          <label className="label-dark">Instrucciones de pago</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={4}
            placeholder="ej: Transferir el monto total al alias indicado. Enviar comprobante dentro de las 24hs."
            className="input-dark w-full resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-brand w-full disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  )
}
