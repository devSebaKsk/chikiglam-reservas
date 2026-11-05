import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { fetchOrderById, uploadPaymentProof } from '@store/slices/orderSlice'
import { clearCart } from '@store/slices/cartSlice'
import { addToast } from '@store/slices/uiSlice'
import GoldenRain from '@lib/three/GoldenRain'
import OrderStatusBadge from '@components/ui/OrderStatusBadge'
import TermsModal from '@components/ui/TermsModal'
import { settingService } from '@services/settingService'
import { packService } from '@services/packService'
import api from '@services/api'
import type { PackResourceWithName } from '@/types'

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentOrder, isLoading } = useAppSelector(s => s.order)
  const aliasRef = useRef<HTMLSpanElement>(null)
  const [alias, setAlias] = useState('')
  const [aliasCopied, setAliasCopied] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [tcAccepted, setTcAccepted] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [packResources, setPackResources] = useState<PackResourceWithName[]>([])

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id))
      dispatch(clearCart())
    }
  }, [id, dispatch])

  useEffect(() => {
    settingService.get('payment_alias').then(v => setAlias(v ?? ''))
    settingService.get('payment_instructions').then(v => setInstructions(v ?? ''))
  }, [])

  // Fetch pack resources for TC annex
  useEffect(() => {
    if (!currentOrder?.packId) return
    packService.getById(currentOrder.packId).then(pack => {
      setPackResources(pack.resources ?? [])
    })
  }, [currentOrder?.packId])

  // Typewriter effect on alias
  useEffect(() => {
    if (!aliasRef.current || !alias) return
    const el = aliasRef.current
    el.textContent = ''
    let i = 0
    const tl = gsap.timeline({ delay: 0.5 })
    tl.to({}, {
      duration: alias.length * 0.06,
      onUpdate: function() {
        const idx = Math.floor(this.progress() * alias.length)
        if (idx > i) {
          i = idx
          el.textContent = alias.slice(0, i)
        }
      },
    })
  }, [alias])

  const handleAcceptTerms = async () => {
    if (!id) return
    setAccepting(true)
    try {
      await api.post(`/orders/${id}/accept-terms`)
      setTcAccepted(true)
    } catch {
      dispatch(addToast({ message: 'Error al registrar la aceptación. Intentá de nuevo.', type: 'error' }))
    } finally {
      setAccepting(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !id) return
    setUploading(true)
    try {
      const result = await dispatch(uploadPaymentProof({ id, file }))
      if (uploadPaymentProof.fulfilled.match(result)) {
        dispatch(addToast({ message: '¡Comprobante enviado!', type: 'success' }))
        navigate('/mis-reservas')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* T&C Modal — shown until accepted */}
      {!tcAccepted && currentOrder && (
        <TermsModal
          packName={currentOrder.packName ?? ''}
          resources={packResources}
          peopleCount={currentOrder.peopleCount}
          onAccept={handleAcceptTerms}
          accepting={accepting}
        />
      )}

      {/* Golden rain hero */}
      <div className="relative h-20 overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 65 }}
          gl={{ antialias: true, alpha: true }}
          className="absolute inset-0 w-full h-full"
        >
          <Suspense fallback={null}>
            <GoldenRain count={80} />
          </Suspense>
        </Canvas>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="text-4xl mb-2">🎉</div>
          <h1 className="text-2xl font-display font-bold text-zinc-100">¡Reserva creada!</h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Aviso 72hs */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10">
          <span className="text-yellow-400 text-lg flex-shrink-0">⚠️</span>
          <p className="text-yellow-300 text-sm leading-relaxed">
            Tenés <strong>72 horas</strong> para realizar la transferencia. Si no se recibe el comprobante en ese plazo, la reserva se cancela automáticamente y la fecha vuelve a estar disponible.
          </p>
        </div>

        {currentOrder && (
          <>
            {(() => {
              const deposit = Math.ceil(currentOrder.totalPrice * 0.3)
              const remaining = currentOrder.totalPrice - deposit
              return (
                <>
                  <div className="dark-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">Estado</span>
                      <OrderStatusBadge status={currentOrder.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">Fecha</span>
                      <span className="text-zinc-100 text-sm font-medium">{currentOrder.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm">Total</span>
                      <span className="text-brand-yellow font-mono font-bold">${currentOrder.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="dark-card divide-y divide-zinc-800">
                    <div className="flex justify-between items-center p-4">
                      <div>
                        <p className="text-zinc-100 text-sm font-semibold">Seña a transferir ahora (30%)</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Para confirmar la reserva</p>
                      </div>
                      <span className="text-brand-pink font-mono font-bold text-lg">${deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4">
                      <div>
                        <p className="text-zinc-400 text-sm font-medium">Restante (70%)</p>
                        <p className="text-zinc-500 text-xs mt-0.5">A abonar el día del evento</p>
                      </div>
                      <span className="text-zinc-400 font-mono text-lg">${remaining.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )
            })()}
          </>
        )}

        {/* Payment info */}
        <div className="dark-card-elevated p-4 space-y-3">
          <h3 className="text-zinc-100 font-semibold">Datos para transferir</h3>
          {alias && (
            <div className="bg-zinc-800/60 rounded-xl p-3">
              <p className="text-zinc-400 text-xs mb-1">Alias</p>
              <div className="flex items-center justify-between gap-3">
                <span
                  ref={aliasRef}
                  className="text-brand-yellow font-mono font-bold text-lg tracking-wider"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(alias)
                    setAliasCopied(true)
                    setTimeout(() => setAliasCopied(false), 2000)
                  }}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                >
                  {aliasCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
          {instructions && (
            <p className="text-zinc-400 text-sm leading-relaxed">{instructions}</p>
          )}
        </div>

        {/* Upload proof */}
        {currentOrder?.status === 'pending_payment' && (
          <div className="dark-card p-4 space-y-3">
            <h3 className="text-zinc-100 font-semibold">Enviar comprobante</h3>
            <label className="block">
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${
                file ? 'border-brand-pink bg-brand-pink/5' : 'border-zinc-700 hover:border-zinc-500'
              }`}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="text-zinc-100 text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <div className="text-3xl mb-2">📎</div>
                    <p className="text-zinc-400 text-sm">Tocá para adjuntar el comprobante</p>
                  </>
                )}
              </div>
            </label>
            <button
              onClick={handleUpload}
              disabled={!file || uploading || isLoading}
              className="btn-brand w-full disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Enviar comprobante'}
            </button>
          </div>
        )}

        <button
          onClick={() => navigate(`/mis-reservas/${id}`)}
          className="w-full text-center text-zinc-400 text-sm py-2 hover:text-zinc-200 transition-colors"
        >
          ← Ver detalle de la reserva
        </button>

        <button
          onClick={() => navigate('/mis-reservas')}
          className="w-full text-center text-zinc-500 text-sm py-1 hover:text-zinc-300 transition-colors"
        >
          Ver mis reservas →
        </button>
      </div>
    </div>
  )
}
