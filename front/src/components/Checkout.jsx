// src/components/Checkout.jsx
import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { crearPedido } from '../api/graphql.js'

// De momento usamos un usuario fijo (id 2, "cliente") ya que
// la práctica no pide login.
const USUARIO_ID = '2'

export default function Checkout({ irA }) {
  const { items, total, vaciarCarrito } = useCart()
  const [enviando, setEnviando] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null)
  const [error, setError] = useState('')

  const handleConfirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const items_ = items.map((it) => ({ productoId: it.id, cantidad: it.cantidad }))
      const pedido = await crearPedido(USUARIO_ID, items_)
      setPedidoConfirmado(pedido)
      vaciarCarrito()
    } catch (err) {
      // Con código es un problema que el cliente puede entender y resolver.
      // Sin código es una falla nuestra y no tiene por qué leer los detalles.
      setError(
        err.codigo ? err.message : 'No pudimos registrar tu pedido. Inténtalo de nuevo en unos minutos.'
      )
    } finally {
      setEnviando(false)
    }
  }

  if (pedidoConfirmado) {
    return (
      <section className="checkout-confirmado">
        <h2>Pedido registrado</h2>
        <p>Número de pedido: #{pedidoConfirmado.id}</p>
        <p>Total: ${Number(pedidoConfirmado.total).toFixed(2)}</p>
        <p>Estado: {pedidoConfirmado.status}</p>
        <button className="btn-primario" onClick={() => irA('home')}>
          Volver a la tienda
        </button>
      </section>
    )
  }

  return (
    <section>
      <h2>Checkout</h2>

      <ul className="lista-carrito">
        {items.map((it) => (
          <li key={it.id} className="carrito-item">
            <span>
              {it.nombre} x{it.cantidad}
            </span>
            <span>${(it.precio * it.cantidad).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <p className="carrito-total">Total a pagar: ${total.toFixed(2)}</p>

      {error && <p className="error">{error}</p>}

      <button className="btn-primario" disabled={enviando} onClick={handleConfirmar}>
        {enviando ? 'Registrando pedido...' : 'Confirmar pedido'}
      </button>
    </section>
  )
}
