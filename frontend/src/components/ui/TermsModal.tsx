import { useState, useRef, useEffect } from 'react'
import type { PackResourceWithName } from '@/types'

const TC_VERSION = '1.0'

const TC_SECTIONS = [
  {
    title: '1. Objeto y Aceptación',
    body: 'El presente documento establece las condiciones para la contratación de servicios de organización y realización de eventos. Al realizar el pago de la seña (reserva), El Cliente declara conocer y aceptar la totalidad de estos términos, dejando constancia de que no es necesaria la firma física del contrato. El plazo máximo para completar el pago de la seña tras la solicitud es de 72 horas.',
  },
  {
    title: '2. Obligaciones del Prestador',
    body: 'Organizar y realizar el evento según las especificaciones del paquete seleccionado. Cumplir con horarios y fechas, salvo causas de fuerza mayor (clima extremo o desastres naturales), en cuyo caso se reprogramará de mutuo acuerdo.',
  },
  {
    title: '3. Condiciones de Pago y Cancelación',
    body: 'Seña de Reserva: Se requiere un abono inicial (aproximadamente el 30% del total) en concepto de reserva no reembolsable.\n\nCancelación: En caso de que el cliente cancele el evento, el abono inicial no será devuelto bajo ninguna circunstancia.\n\nSaldo: El monto restante debe ser cancelado en su totalidad antes del inicio del evento.',
  },
  {
    title: '4. Asistentes y Capacidad',
    body: 'El presupuesto se basa en un número específico de asistentes confirmado al momento de la reserva.\n\nSi el número de asistentes disminuye, el cliente deberá abonar el total pactado originalmente.\n\nPara aumentar el número de asistentes, se debe informar con al menos 5 días de anticipación, sujeto a disponibilidad y cargos adicionales.',
  },
  {
    title: '5. Cuidado del Equipamiento y Prohibiciones',
    body: 'Responsabilidad: El Cliente es responsable de devolver los artículos (carpas, colchonetas, decoración, proyectores, etc.) en el mismo estado en que fueron recibidos.\n\nProhibición de Maquillaje: Está estrictamente prohibido el uso de maquillaje dentro de las carpas.\n\nPenalidad por Limpieza: En caso de encontrarse artículos manchados o dañados, se cobrará un cargo adicional de $40.000 para limpieza o el valor de reposición si fuera necesario.',
  },
  {
    title: '6. Responsabilidad sobre Menores',
    body: 'El Cliente asume la total responsabilidad por el cuidado, conducta y seguridad de los menores de edad durante el transcurso del evento, eximiendo al prestador de cualquier responsabilidad por incidentes o accidentes.',
  },
  {
    title: '7. Ley Aplicable y Jurisdicción',
    body: 'Este acuerdo se rige por las leyes de la República Argentina. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales de la ciudad de Neuquén.',
  },
]

interface Props {
  packName: string
  resources: PackResourceWithName[]
  peopleCount: number
  onAccept: () => void
  accepting: boolean
}

export default function TermsModal({ packName, resources, peopleCount, onAccept, accepting }: Props) {
  const [checked, setChecked] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-[430px] bg-zinc-950 rounded-t-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-zinc-800 flex-shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
          <h2 className="text-lg font-display font-bold text-zinc-100">Términos y Condiciones</h2>
          <p className="text-zinc-500 text-xs mt-1">Versión {TC_VERSION} — Leé antes de confirmar tu reserva</p>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {TC_SECTIONS.map(s => (
            <div key={s.title}>
              <h3 className="text-zinc-100 text-sm font-semibold mb-1">{s.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}

          {/* Annex: pack resources */}
          <div className="border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-zinc-100 text-sm font-semibold">Anexo — Detalle del Servicio Contratado</h3>
            <p className="text-zinc-400 text-sm">Pack: <span className="text-zinc-200 font-medium">{packName}</span></p>
            <p className="text-zinc-400 text-sm">Personas: <span className="text-zinc-200 font-medium">{peopleCount}</span></p>
            {resources.length > 0 && (
              <div>
                <p className="text-zinc-500 text-xs mb-2">Recursos incluidos:</p>
                <ul className="space-y-1.5">
                  {resources
                    .map(r => ({ ...r, qty: r.quantityFixed + r.quantityPerPerson * peopleCount }))
                    .filter(r => r.qty > 0)
                    .map(r => (
                      <li key={r.id} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{r.resourceName}</span>
                        <span className="text-zinc-300 font-medium">{r.qty} u.</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-[#f4068b] flex-shrink-0"
            />
            <span className="text-zinc-300 text-sm leading-relaxed">
              He leído y acepto los <strong>Términos y Condiciones de Servicio</strong>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={onAccept}
            disabled={!checked || accepting}
            className="btn-brand w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {accepting ? 'Procesando...' : 'Aceptar y continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
