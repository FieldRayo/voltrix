import { useCarrito } from '../lib/carrito.js'

export default function BotonCarrito() {
  const { totalItems } = useCarrito()
  return (
    <a className="nav-boton topbar-carrito" href="/carrito">
      Carrito
      {totalItems > 0 && (
        <span className="badge" aria-label={`${totalItems} artículos`}>
          {totalItems}
        </span>
      )}
    </a>
  )
}
