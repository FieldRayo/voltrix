import { despachar, dinero, useCarrito } from '../lib/carrito.js'

export default function Carrito() {
  const { items, total } = useCarrito()

  if (items.length === 0) {
    return (
      <section className="panel vacio">
        <h1>Tu carrito está vacío</h1>
        <a className="btn-primario" href="/">
          Ver productos
        </a>
      </section>
    )
  }

  return (
    <section>
      <h1>Carrito</h1>
      <ul className="lista-carrito">
        {items.map((it) => (
          <li key={it.id} className="carrito-item">
            <a className="carrito-nombre" href={`/producto/${it.id}`}>
              {it.nombre}
            </a>
            <input
              type="number"
              min="1"
              max={it.stock}
              value={it.cantidad}
              aria-label={`Cantidad de ${it.nombre}`}
              onChange={(e) => despachar({ type: 'CAMBIAR_CANTIDAD', payload: { id: it.id, cantidad: Number(e.target.value) } })}
            />
            {it.cantidad >= it.stock && <span className="tope">Es todo lo que queda</span>}
            <span className="carrito-subtotal">{dinero(it.precio * it.cantidad)}</span>
            <button type="button" onClick={() => despachar({ type: 'QUITAR', payload: it.id })}>
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <p className="carrito-total">Total: {dinero(total)}</p>
      <a className="btn-primario" href="/checkout">
        Ir a pagar
      </a>
    </section>
  )
}
