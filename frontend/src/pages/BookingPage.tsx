import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@store/hooks'
import { createBooking } from '@store/slices/bookingSlice'
import { useToast } from '@hooks/useToast'
import { useGsapFadeIn } from '@hooks/useGsap'

export default function BookingPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const formRef = useGsapFadeIn()
  const [form, setForm] = useState({ serviceId: '', date: '', time: '', notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await dispatch(createBooking(form))
    setIsSubmitting(false)
    if (createBooking.fulfilled.match(result)) {
      toast.success('¡Reserva creada exitosamente!')
      navigate('/dashboard')
    } else {
      toast.error('Error al crear la reserva')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={formRef} className="card shadow-xl">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Nueva Reserva</h1>
        <p className="text-gray-500 mb-8">Elige el servicio y horario de tu preferencia</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} className="input-field">
              <option value="">Selecciona un servicio</option>
              <option value="1">Corte de cabello — $25</option>
              <option value="2">Manicure — $20</option>
              <option value="3">Pedicure — $30</option>
              <option value="4">Facial — $50</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" required min={new Date().toISOString().split('T')[0]} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horario</label>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setForm({ ...form, time: slot })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.time === slot
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-200 text-gray-700 hover:border-primary-400'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" placeholder="Instrucciones especiales o preferencias..." />
          </div>
          <button type="submit" disabled={isSubmitting || !form.serviceId || !form.date || !form.time} className="btn-primary w-full py-3 disabled:opacity-70">
            {isSubmitting ? 'Creando reserva...' : 'Confirmar Reserva'}
          </button>
        </form>
      </div>
    </div>
  )
}
