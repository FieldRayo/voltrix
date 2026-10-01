// src/components/Carrito.jsx
import { useCart } from '../context/CartContext.jsx'

export default function Carrito({ irA }) {
  const { items, quitarDelCarrito, cambiarCantidad, total } = useCart()

  if (items.length === 0) {
    return (
      <section>
        <h2>Tu carrito está vacío</h2>
        <button className="btn-primario" onClick={() => irA('home')}>
          Ir a comprar
        </button>
      </section>
    )
  }

  return (
    <section>
      <h2>Carrito</h2>
      <ul className="lista-carrito">
        {items.map((it) => (
          <li key={it.id} className="carrito-item">
            <span>{it.nombre}</span>
            <input
              type="number"
              min="1"
              max={it.stock}
              value={it.cantidad}
              aria-label={`Cantidad de ${it.nombre}`}
              onChange={(e) => cambiarCantidad(it.id, Number(e.target.value))}
            />
            {it.cantidad >= it.stock && <span className="tope">Es todo lo que queda</span>}
            <span>${(it.precio * it.cantidad).toFixed(2)}</span>
            <button onClick={() => quitarDelCarrito(it.id)}>Quitar</button>
          </li>
        ))}
      </ul>

      <p className="carrito-total">Total: ${total.toFixed(2)}</p>

      <button className="btn-primario" onClick={() => irA('checkout')}>
        Ir a pagar
      </button>
    </section>
  )
}
