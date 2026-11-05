import type { OrderStatus } from '@/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_payment:      { label: 'Pago pendiente',         className: 'badge-pending-payment' },
  pending_confirmation: { label: 'Confirmación pendiente', className: 'badge-pending-confirmation' },
  confirmed:            { label: 'Confirmada',             className: 'badge-confirmed' },
  cancelled:            { label: 'Cancelada',              className: 'badge-cancelled' },
  completed:            { label: 'Realizada',              className: 'badge-completed' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export default function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`${className} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} rounded-full font-semibold inline-block`}>
      {label}
    </span>
  )
}
