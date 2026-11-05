export default function ContactPage() {
  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      <h1 className="font-display font-bold text-2xl text-zinc-100">Contacto</h1>

      <div className="dark-card p-5 space-y-2">
        <h2 className="text-zinc-100 font-semibold text-base">¿Tenés alguna consulta o inconveniente?</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Estamos para ayudarte. Escribinos por WhatsApp y te respondemos a la brevedad.
        </p>
      </div>

      <a
        href="https://wa.me/+5492995217901"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 dark-card p-5 active:scale-[0.97] transition-transform"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-zinc-100 font-semibold text-sm">WhatsApp</p>
          <p className="text-zinc-400 text-xs mt-0.5">+54 9 299 521-7901</p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-zinc-600">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      <div className="dark-card p-5 space-y-3">
        <h3 className="text-zinc-100 font-semibold text-sm">Horarios de atención</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Lunes a Viernes</span>
            <span className="text-zinc-300">10:00 – 20:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Sábados</span>
            <span className="text-zinc-300">10:00 – 17:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Domingos</span>
            <span className="text-zinc-500">Cerrado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
