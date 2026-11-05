import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-display font-bold text-xl mb-3">ChikiGlam</h3>
            <p className="text-sm leading-relaxed">Tu experiencia de belleza personalizada. Reserva fácil, rápido y seguro.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Registrarse</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li>info@chikiglam.com</li>
              <li>+1 (555) 000-0000</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          © {new Date().getFullYear()} ChikiGlam. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
