import { useEffect, useState } from 'react'
import { despachar, dinero, useCarrito } from '../lib/carrito.js'
import { gql, useSesion } from '../lib/sesion.js'

const CREAR_PEDIDO = `
  mutation ($items: [ItemPedidoInput!]!) {
    crearPedido(items: $items) { id total status fecha }
  }
`

export default function Checkout() {
  const sesion = useSesion()
  const { items, total } = useCarrito()
  const [enviando, setEnviando] = useState(false)
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sesion === null) location.replace('/login?siguiente=/checkout')
  }, [sesion])

  if (!sesion) return <p className="cargando">Cargando…</p>

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const { crearPedido } = await gql(CREAR_PEDIDO, {
        items: items.map((it) => ({ productoId: it.id, cantidad: it.cantidad })),
      })
      setPedido(crearPedido)
      despachar({ type: 'VACIAR' })
    } catch (err) {
      setError(err.codigo ? err.message : 'No pudimos registrar tu pedido. Inténtalo de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

  if (pedido) {
    return (
      <section className="panel checkout-confirmado">
        <h1>¡Gracias por tu compra!</h1>
        <p>Pedido #{pedido.id} por {dinero(pedido.total)}.</p>
        <p>Puedes seguir su estado en tu cuenta.</p>
        <a className="btn-primario" href="/cuenta">
          Ver mis pedidos
        </a>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="panel vacio">
        <h1>No hay nada que pagar</h1>
        <a className="btn-primario" href="/">
          Ver productos
        </a>
      </section>
    )
  }

  return (
    <section>
      <h1>Confirmar pedido</h1>
      <p className="introduccion">A nombre de {sesion.usuario?.nombre} ({sesion.usuario?.email}).</p>
      <ul className="lista-carrito">
        {items.map((it) => (
          <li key={it.id} className="carrito-item">
            <span className="carrito-nombre">
              {it.nombre} × {it.cantidad}
            </span>
            <span className="carrito-subtotal">{dinero(it.precio * it.cantidad)}</span>
          </li>
        ))}
      </ul>
      <p className="carrito-total">Total a pagar: {dinero(total)}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-primario" type="button" disabled={enviando} onClick={confirmar}>
        {enviando ? 'Registrando pedido…' : 'Confirmar pedido'}
      </button>
    </section>
  )
}
