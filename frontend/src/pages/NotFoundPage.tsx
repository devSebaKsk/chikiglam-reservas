import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="text-center">
        <div className="text-8xl font-display font-bold text-primary-200 mb-4">404</div>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-500 mb-8">La página que buscas no existe.</p>
        <Link to="/" className="btn-primary">Volver al inicio</Link>
      </div>
    </div>
  )
}
