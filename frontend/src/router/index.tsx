import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '@components/layout/RootLayout'
import AdminLayout from '@components/layout/AdminLayout'
import ProtectedRoute from '@components/common/ProtectedRoute'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import { useAuth } from '@hooks/useAuth'

// ─── Client / public pages ────────────────────────────────────────────────────
const HomePage           = lazy(() => import('@pages/HomePage'))
const LoginPage          = lazy(() => import('@pages/LoginPage'))
const ClientLoginPage    = lazy(() => import('@pages/ClientLoginPage'))
const RegisterPage       = lazy(() => import('@pages/RegisterPage'))
const NotFoundPage       = lazy(() => import('@pages/NotFoundPage'))
const PacksPage          = lazy(() => import('@pages/PacksPage'))
const ContactPage        = lazy(() => import('@pages/ContactPage'))
const PackDetailPage     = lazy(() => import('@pages/PackDetailPage'))
const CartPage           = lazy(() => import('@pages/CartPage'))
const DateSelectionPage  = lazy(() => import('@pages/DateSelectionPage'))
const OrderSummaryPage   = lazy(() => import('@pages/OrderSummaryPage'))
const PaymentPage        = lazy(() => import('@pages/PaymentPage'))
const MyOrdersPage       = lazy(() => import('@pages/MyOrdersPage'))
const OrderDetailPage    = lazy(() => import('@pages/OrderDetailPage'))
const EventDetailPage    = lazy(() => import('@pages/EventDetailPage'))

// ─── Admin pages ──────────────────────────────────────────────────────────────
const AdminPacksPage                 = lazy(() => import('@pages/admin/AdminPacksPage'))
const AdminPackEditPage              = lazy(() => import('@pages/admin/AdminPackEditPage'))
const AdminAdditionalsPage           = lazy(() => import('@pages/admin/AdminAdditionalsPage'))
const AdminResourcesPage             = lazy(() => import('@pages/admin/AdminResourcesPage'))
const AdminOrdersPage                = lazy(() => import('@pages/admin/AdminOrdersPage'))
const AdminOrderDetailPage           = lazy(() => import('@pages/admin/AdminOrderDetailPage'))
const AdminCreateOrderPage           = lazy(() => import('@pages/admin/AdminCreateOrderPage'))
const AdminEventsPage                = lazy(() => import('@pages/admin/AdminEventsPage'))
const AdminEventEditPage             = lazy(() => import('@pages/admin/AdminEventEditPage'))
const AdminEventRegistrationsPage    = lazy(() => import('@pages/admin/AdminEventRegistrationsPage'))
const AdminSettingsPage              = lazy(() => import('@pages/admin/AdminSettingsPage'))
const AdminPromosPage                = lazy(() => import('@pages/admin/AdminPromosPage'))
const UsersPage                      = lazy(() => import('@pages/admin/UsersPage'))

// ─── Legacy / existing pages ──────────────────────────────────────────────────
const SuperAdminPage = lazy(() => import('@pages/superadmin/SuperAdminPage'))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = (C: React.LazyExoticComponent<() => any>) => (
  <Suspense fallback={<LoadingSpinner />}>
    <C />
  </Suspense>
)

/** Redirige al organizer al área de eventos, a los demás a reservas */
function AdminIndex() {
  const { isOrganizer } = useAuth()
  return <Navigate to={isOrganizer ? '/admin/events' : '/admin/orders'} replace />
}

export const router = createBrowserRouter([
  // ─── Client shell ───────────────────────────────────────────────────────────
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Públicas
      { index: true,              element: s(HomePage) },
      { path: 'login',            element: s(LoginPage) },
      { path: 'acceder',          element: s(ClientLoginPage) },
      { path: 'register',         element: s(RegisterPage) },
      { path: 'packs',            element: s(PacksPage) },
      { path: 'contacto',         element: s(ContactPage) },
      { path: 'packs/:id',        element: s(PackDetailPage) },
      { path: 'cart',             element: s(CartPage) },
      { path: 'cart/date',        element: s(DateSelectionPage) },
      { path: 'eventos/:id',      element: s(EventDetailPage) },

      // Requieren haber pasado el OTP (client+)
      {
        element: <ProtectedRoute minRole="client" />,
        children: [
          { path: 'cart/confirm',       element: s(OrderSummaryPage) },
          { path: 'orders/:id/payment', element: s(PaymentPage) },
          { path: 'mis-reservas',       element: s(MyOrdersPage) },
          { path: 'mis-reservas/:id',   element: s(OrderDetailPage) },
        ],
      },

      // Superadmin
      {
        path: 'superadmin',
        element: <ProtectedRoute allowedRoles={['superadmin']} />,
        children: [
          { index: true, element: s(SuperAdminPage) },
        ],
      },

      { path: '*', element: s(NotFoundPage) },
    ],
  },

  // ─── Admin shell (its own layout, no BottomNav) ───────────────────────────
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['organizer', 'admin', 'superadmin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true,                         element: <AdminIndex /> },
          { path: 'packs',                       element: s(AdminPacksPage) },
          { path: 'packs/:id',                   element: s(AdminPackEditPage) },
          { path: 'additionals',                 element: s(AdminAdditionalsPage) },
          { path: 'resources',                   element: s(AdminResourcesPage) },
          { path: 'orders',                      element: s(AdminOrdersPage) },
          { path: 'orders/new',                  element: s(AdminCreateOrderPage) },
          { path: 'orders/:id',                  element: s(AdminOrderDetailPage) },
          { path: 'events',                      element: s(AdminEventsPage) },
          { path: 'events/:id',                  element: s(AdminEventEditPage) },
          { path: 'events/:id/registrations',    element: s(AdminEventRegistrationsPage) },
          { path: 'promos',                      element: s(AdminPromosPage) },
          { path: 'settings',                    element: s(AdminSettingsPage) },
          { path: 'users',                       element: s(UsersPage) },
        ],
      },
    ],
  },
])
