import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { orderService } from '@services/orderService'
import { useAuth } from '@hooks/useAuth'
import OrderStatusBadge from '@components/ui/OrderStatusBadge'
import { FREE_LOCALITIES, PAID_LOCALITIES, LOCALITY_FEE, LOCALITY_OTHER } from '@store/slices/cartSlice'
import type { Order, OrderPayment } from '@/types'

const EVENT_TYPES = [
  { value: 'nina',  label: 'Niña' },
  { value: 'nino',  label: 'Niño' },
  { value: 'mixto', label: 'Mixto' },
]

function parseNotes(notes: string | null | undefined) {
  const r = { locality: '', address: '', eventType: '', childName: '', birthdayAge: '', colorSuggestions: '' }
  if (!notes) return r
  notes.split(' | ').forEach(part => {
    if (part.startsWith('Localidad: '))        r.locality          = part.slice('Localidad: '.length)
    if (part.startsWith('Dirección: '))        r.address           = part.slice('Dirección: '.length)
    if (part.startsWith('Evento: '))           r.eventType         = part.slice('Evento: '.length)
    if (part.startsWith('Infante: '))          r.childName         = part.slice('Infante: '.length)
    if (part.startsWith('Edad cumpleañer@: ')) r.birthdayAge       = part.slice('Edad cumpleañer@: '.length)
    if (part.startsWith('Colores: '))          r.colorSuggestions  = part.slice('Colores: '.length)
  })
  return r
}

function buildNotes(f: { locality: string; address: string; eventType: string; childName: string; birthdayAge: string; colorSuggestions: string }) {
  const parts: string[] = []
  if (f.locality)          parts.push(`Localidad: ${f.locality}`)
  if (f.address)           parts.push(`Dirección: ${f.address}`)
  if (f.eventType)         parts.push(`Evento: ${f.eventType}`)
  if (f.childName)         parts.push(`Infante: ${f.childName}`)
  if (f.birthdayAge)       parts.push(`Edad cumpleañer@: ${f.birthdayAge}`)
  if (f.colorSuggestions)  parts.push(`Colores: ${f.colorSuggestions}`)
  return parts.join(' | ')
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAdmin } = useAuth()
  const ref = useGsapFadeIn(0.1)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [payments, setPayments] = useState<OrderPayment[]>([])
  const [paymentForm, setPaymentForm] = useState({ amount: '', description: '' })
  const [addingPayment, setAddingPayment] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [savingDate, setSavingDate] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsForm, setDetailsForm] = useState({
    user_name: '', user_phone: '', people_count: '',
    locality: '', address: '', eventType: '', childName: '', birthdayAge: '', colorSuggestions: '',
  })

  useEffect(() => {
    if (!id) return
    orderService.getById(id).then(setOrder).finally(() => setLoading(false))
    orderService.getPayments(id).then(setPayments).catch(() => {})
  }, [id])

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const isFullyPaid = order ? totalPaid >= order.totalPrice : false

  const handleUpdateStatus = async (status: 'confirmed' | 'cancelled' | 'completed') => {
    if (!id) return
    setUpdating(true)
    try {
      await orderService.updateStatus(id, status)
      setOrder(o => o ? { ...o, status } : o)
      const msg = status === 'confirmed' ? 'Reserva confirmada' : status === 'completed' ? 'Reserva marcada como realizada' : 'Reserva cancelada'
      dispatch(addToast({ message: msg, type: 'success' }))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar'
      dispatch(addToast({ message: msg, type: 'error' }))
    } finally {
      setUpdating(false)
    }
  }

  const handleViewProof = async () => {
    if (!id) return
    try {
      await orderService.openProof(id)
    } catch {
      dispatch(addToast({ message: 'No hay comprobante disponible', type: 'warning' }))
    }
  }

  const handleAddPayment = async () => {
    if (!id || !paymentForm.amount) return
    setAddingPayment(true)
    try {
      const payment = await orderService.addPayment(id, {
        amount: parseFloat(paymentForm.amount),
        description: paymentForm.description || undefined,
      })
      setPayments(list => [...list, payment])
      setPaymentForm({ amount: '', description: '' })
      dispatch(addToast({ message: 'Pago registrado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al registrar pago', type: 'error' }))
    } finally {
      setAddingPayment(false)
    }
  }

  const handleRemovePayment = async (paymentId: string) => {
    if (!id) return
    try {
      await orderService.removePayment(id, paymentId)
      setPayments(list => list.filter(p => p.id !== paymentId))
      dispatch(addToast({ message: 'Pago eliminado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al eliminar pago', type: 'error' }))
    }
  }

  const handleSaveDate = async () => {
    if (!id || !newDate) return
    setSavingDate(true)
    try {
      await orderService.updateDate(id, newDate)
      setOrder(o => o ? { ...o, date: newDate } : o)
      setEditingDate(false)
      dispatch(addToast({ message: 'Fecha actualizada', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al actualizar la fecha', type: 'error' }))
    } finally {
      setSavingDate(false)
    }
  }

  const openEditDetails = () => {
    if (!order) return
    const parsed = parseNotes(order.notes)
    setDetailsForm({
      user_name:        order.userName ?? '',
      user_phone:       order.userPhone ?? '',
      people_count:     String(order.peopleCount),
      locality:         parsed.locality,
      address:          parsed.address,
      eventType:        parsed.eventType,
      childName:        parsed.childName,
      birthdayAge:      parsed.birthdayAge,
      colorSuggestions: parsed.colorSuggestions,
    })
    setEditingDetails(true)
  }

  const handleSaveDetails = async () => {
    if (!id || !order) return
    setSavingDetails(true)
    try {
      const notes = buildNotes(detailsForm)
      const people = parseInt(detailsForm.people_count) || order.peopleCount
      const result = await orderService.updateDetails(id, {
        user_name:    detailsForm.user_name.trim() || undefined,
        user_phone:   detailsForm.user_phone.trim() || undefined,
        notes,
        locality:     detailsForm.locality,
        people_count: people !== order.peopleCount ? people : undefined,
      })
      setOrder(o => o ? {
        ...o,
        userName:    detailsForm.user_name.trim() || o.userName,
        userPhone:   detailsForm.user_phone.trim() || o.userPhone,
        notes,
        peopleCount: people,
        totalPrice:  result.total_price,
      } : o)
      setEditingDetails(false)
      dispatch(addToast({ message: 'Datos actualizados', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSavingDetails(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!id || !window.confirm('¿Eliminar esta reserva permanentemente?')) return
    try {
      await orderService.deleteOrder(id)
      dispatch(addToast({ message: 'Reserva eliminada', type: 'success' }))
      navigate('/admin/orders')
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-24">
        <p className="text-zinc-500">Reserva no encontrada.</p>
      </div>
    )
  }

  const deposit = Math.ceil(order.totalPrice * 0.3)
  const remaining = order.totalPrice - deposit
  const saldo = order.totalPrice - totalPaid

  return (
    <div ref={ref} className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors text-lg"
        >
          ‹
        </button>
        <h1 className="text-xl font-display font-bold text-zinc-100">Detalle de reserva</h1>
      </div>

      {/* Status */}
      <div className="dark-card-elevated p-4 flex items-center justify-between">
        <span className="text-zinc-400 text-sm">Estado</span>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Client info + edit button */}
      <div className="dark-card divide-y divide-zinc-800">
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Cliente</p>
            <p className="text-zinc-100 font-semibold">{order.userName ?? '—'}</p>
            {order.userPhone && <p className="text-zinc-400 text-sm mt-0.5">{order.userPhone}</p>}
          </div>
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <button
              onClick={openEditDetails}
              className="text-xs text-zinc-500 hover:text-brand-pink transition-colors px-2 py-1 rounded-lg bg-zinc-800/50 flex-shrink-0"
            >
              ✏️ Editar datos
            </button>
          )}
        </div>
      </div>

      {/* Edit details panel */}
      {editingDetails && (
        <div className="dark-card p-4 space-y-3">
          <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium">Editar datos de la reserva</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-dark">Nombre adulto</label>
              <input type="text" value={detailsForm.user_name}
                onChange={e => setDetailsForm(f => ({ ...f, user_name: e.target.value }))}
                className="input-dark w-full" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="label-dark">WhatsApp</label>
              <input type="tel" value={detailsForm.user_phone}
                onChange={e => setDetailsForm(f => ({ ...f, user_phone: e.target.value }))}
                className="input-dark w-full" placeholder="+54 9 11..." />
            </div>
          </div>

          <div>
            <label className="label-dark">Personas</label>
            <input type="number" value={detailsForm.people_count}
              onChange={e => setDetailsForm(f => ({ ...f, people_count: e.target.value }))}
              className="input-dark w-full" placeholder={String(order.peopleCount)} />
          </div>

          <div>
            <label className="label-dark">Localidad</label>
            <select value={detailsForm.locality}
              onChange={e => setDetailsForm(f => ({ ...f, locality: e.target.value }))}
              className="input-dark w-full">
              <option value="">Sin especificar</option>
              <optgroup label="Sin cargo">
                {FREE_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
              <optgroup label={`+ $${LOCALITY_FEE.toLocaleString()} traslado`}>
                {PAID_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
              </optgroup>
              <option value={LOCALITY_OTHER}>Otras localidades</option>
            </select>
            {PAID_LOCALITIES.includes(detailsForm.locality) && (
              <p className="text-brand-pink text-xs mt-1">Se sumará ${LOCALITY_FEE.toLocaleString()} al total por traslado</p>
            )}
            {detailsForm.locality === LOCALITY_OTHER && (
              <p className="text-brand-yellow text-xs mt-1">⚠️ Traslado a coordinar — no se ajusta el precio automáticamente</p>
            )}
          </div>

          <div>
            <label className="label-dark">Dirección</label>
            <input type="text" value={detailsForm.address}
              onChange={e => setDetailsForm(f => ({ ...f, address: e.target.value }))}
              className="input-dark w-full" placeholder="Calle y número" />
          </div>

          <div>
            <label className="label-dark">Tipo de evento</label>
            <div className="flex gap-2 mt-1">
              {EVENT_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setDetailsForm(f => ({ ...f, eventType: t.value }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    detailsForm.eventType === t.value ? 'bg-brand-pink text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-dark">Nombre del infante</label>
              <input type="text" value={detailsForm.childName}
                onChange={e => setDetailsForm(f => ({ ...f, childName: e.target.value }))}
                className="input-dark w-full" placeholder="Ej: Sofía" />
            </div>
            <div>
              <label className="label-dark">Edad</label>
              <input type="text" value={detailsForm.birthdayAge}
                onChange={e => setDetailsForm(f => ({ ...f, birthdayAge: e.target.value }))}
                className="input-dark w-full" placeholder="Ej: 8 años" />
            </div>
          </div>

          <div>
            <label className="label-dark">Sugerencias de colores</label>
            <input type="text" value={detailsForm.colorSuggestions}
              onChange={e => setDetailsForm(f => ({ ...f, colorSuggestions: e.target.value }))}
              className="input-dark w-full" placeholder="Ej: rosa y dorado" />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveDetails}
              disabled={savingDetails}
              className="flex-1 py-2.5 bg-brand-pink text-white text-sm font-semibold rounded-xl hover:bg-brand-pink/80 transition-colors disabled:opacity-50"
            >
              {savingDetails ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={() => setEditingDetails(false)}
              className="px-4 py-2.5 bg-zinc-800 text-zinc-400 text-sm rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="dark-card divide-y divide-zinc-800">
        <div className="flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Pack</span>
          <span className="text-zinc-100 font-medium text-sm">{order.packName}</span>
        </div>
        <div className="flex justify-between items-center p-4 gap-3">
          <span className="text-zinc-400 text-sm flex-shrink-0">Fecha del evento</span>
          {editingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-100 text-sm focus:outline-none focus:border-brand-pink"
              />
              <button
                onClick={handleSaveDate}
                disabled={savingDate || !newDate}
                className="text-emerald-400 text-sm hover:text-emerald-300 disabled:opacity-50"
              >
                {savingDate ? '...' : '✓'}
              </button>
              <button
                onClick={() => setEditingDate(false)}
                className="text-zinc-500 text-sm hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-medium text-sm">{order.date}</span>
              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <button
                  onClick={() => { setNewDate(order.date); setEditingDate(true) }}
                  className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                  title="Reprogramar fecha"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Personas</span>
          <span className="text-zinc-100 font-medium text-sm">{order.peopleCount}</span>
        </div>
        {order.notes && (
          <div className="flex justify-between p-4 gap-4">
            <span className="text-zinc-400 text-sm flex-shrink-0">Notas</span>
            <span className="text-zinc-100 text-sm text-right">{order.notes}</span>
          </div>
        )}
        {(() => {
          const loc = parseNotes(order.notes).locality
          const addlTotal = order.additionals?.reduce((s, a) => s + a.unitPrice * a.quantity, 0) ?? 0
          const locFee = PAID_LOCALITIES.includes(loc) ? LOCALITY_FEE : 0
          const packBase = order.totalPrice - addlTotal - locFee
          return (
            <div className="flex justify-between p-4">
              <span className="text-zinc-400 text-sm">Pack · {order.peopleCount} personas</span>
              <span className="text-brand-yellow font-mono text-sm">${packBase.toLocaleString()}</span>
            </div>
          )
        })()}
        {order.additionals?.map(a => (
          <div key={a.id} className="flex justify-between p-4">
            <span className="text-zinc-400 text-sm">{a.additionalName} ×{a.quantity}</span>
            <span className="text-brand-yellow font-mono text-sm">${(a.unitPrice * a.quantity).toLocaleString()}</span>
          </div>
        ))}
        {(() => {
          const loc = parseNotes(order.notes).locality
          return PAID_LOCALITIES.includes(loc) ? (
            <div className="flex justify-between p-4">
              <span className="text-zinc-400 text-sm">Traslado ({loc})</span>
              <span className="text-brand-yellow font-mono text-sm">${LOCALITY_FEE.toLocaleString()}</span>
            </div>
          ) : null
        })()}
        <div className="flex justify-between p-4 border-t border-zinc-700">
          <span className="text-zinc-100 font-bold">Total</span>
          <span className="text-brand-yellow font-mono font-bold text-xl">${order.totalPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="dark-card divide-y divide-zinc-800">
        <div className="flex justify-between items-center p-4">
          <div>
            <p className="text-zinc-100 text-sm font-semibold">Seña (30%)</p>
            <p className="text-zinc-500 text-xs mt-0.5">A transferir para confirmar</p>
          </div>
          <span className="text-brand-pink font-mono font-bold">${deposit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center p-4">
          <div>
            <p className="text-zinc-400 text-sm font-medium">Restante (70%)</p>
            <p className="text-zinc-500 text-xs mt-0.5">A abonar el día del evento</p>
          </div>
          <span className="text-zinc-400 font-mono">${remaining.toLocaleString()}</span>
        </div>
      </div>

      {/* Estado de cuenta */}
      {(order.status === 'confirmed' || order.status === 'completed') && (
        <div className="dark-card divide-y divide-zinc-800">
          <div className="p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium mb-3">Estado de cuenta</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total reserva</span>
                <span className="text-zinc-100 font-mono">${order.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total pagado</span>
                <span className={`font-mono font-semibold ${isFullyPaid ? 'text-emerald-400' : 'text-brand-yellow'}`}>
                  ${totalPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-zinc-800 pt-2 mt-1">
                <span className="text-zinc-300 font-semibold">Saldo pendiente</span>
                <span className={`font-mono font-bold ${saldo <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {saldo <= 0 ? '✓ Pagado' : `$${saldo.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de pagos */}
          {payments.length > 0 && (
            <div className="p-4 space-y-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Historial de pagos</p>
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-300 text-sm">{p.description || 'Pago'}</span>
                    <span className="text-zinc-500 text-xs ml-2">{p.createdAt.slice(0, 10)}</span>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-medium">+${p.amount.toLocaleString()}</span>
                  {order.status !== 'completed' && (
                    <button
                      onClick={() => handleRemovePayment(p.id)}
                      className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                    >🗑</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Registrar pago */}
          {order.status === 'confirmed' && (
            <div className="p-4 space-y-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Registrar pago</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand-pink"
                />
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Monto"
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand-pink"
                />
                <button
                  onClick={handleAddPayment}
                  disabled={addingPayment || !paymentForm.amount}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingPayment ? '...' : '+'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment proof */}
      {(order.status === 'pending_confirmation' || order.status === 'confirmed') && (
        <button
          onClick={handleViewProof}
          className="w-full flex items-center justify-center gap-2 dark-card p-4 text-zinc-300 text-sm hover:text-zinc-100 transition-colors"
        >
          📎 Ver comprobante de pago
        </button>
      )}

      {/* Actions */}
      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <div className="space-y-2 pt-1">
          {order.status === 'pending_confirmation' && (
            <button
              onClick={() => handleUpdateStatus('confirmed')}
              disabled={updating}
              className="w-full py-3 rounded-2xl font-semibold text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              ✓ Confirmar reserva
            </button>
          )}
          {order.status === 'pending_payment' && isAdmin && (
            <button
              onClick={() => handleUpdateStatus('confirmed')}
              disabled={updating}
              className="w-full py-3 rounded-2xl font-semibold text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              ✓ Confirmar sin comprobante
            </button>
          )}
          {order.status === 'confirmed' && (
            <div>
              <button
                onClick={() => handleUpdateStatus('completed')}
                disabled={updating || !isFullyPaid}
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 transition-colors disabled:opacity-50"
              >
                ★ Marcar como realizada
              </button>
              {!isFullyPaid && (
                <p className="text-zinc-500 text-xs text-center mt-1">Registrá el pago completo primero</p>
              )}
            </div>
          )}
          {(order.status === 'pending_payment' || order.status === 'pending_confirmation' || order.status === 'confirmed') && (
            <button
              onClick={() => handleUpdateStatus('cancelled')}
              disabled={updating}
              className="w-full py-3 rounded-2xl font-semibold text-sm bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              ✕ Cancelar reserva
            </button>
          )}
        </div>
      )}

      {order.status === 'completed' && (
        <div className="text-center py-2">
          <span className="text-brand-purple text-sm font-medium">★ Reserva realizada</span>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div className="space-y-3 pt-1">
          <div className="text-center py-2">
            <span className="text-zinc-500 text-sm">Reserva cancelada</span>
          </div>
          <button
            onClick={handleDeleteOrder}
            className="w-full py-3 rounded-2xl font-semibold text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            🗑 Eliminar reserva permanentemente
          </button>
        </div>
      )}
    </div>
  )
}
