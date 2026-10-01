import { useEffect, useState } from 'react'
import { dinero } from '../lib/carrito.js'
import { gql, useSesion } from '../lib/sesion.js'

const MIS_PEDIDOS = `{
  yo {
    nombre
    email
    pedidos {
      id fecha total status
      detalles { cantidad subtotal producto { id nombre } }
    }
  }
}`

const ESTADOS = {
  PENDIENTE: 'Pendiente de pago',
  PAGADO: 'Pagado',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export default function Cuenta() {
  const sesion = useSesion()
  const [yo, setYo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sesion === null) location.replace('/login?siguiente=/cuenta')
  }, [sesion])

  const conSesion = Boolean(sesion)
  useEffect(() => {
    if (!conSesion) return
    gql(MIS_PEDIDOS)
      .then((d) => setYo(d.yo))
      .catch(() => setError('No pudimos cargar tus pedidos.'))
  }, [conSesion])

  if (error) return <p className="error">{error}</p>
  if (!yo) return <p className="cargando">Cargando…</p>

  return (
    <section>
      <h1>Hola, {yo.nombre}</h1>
      <p className="introduccion">{yo.email}</p>
      <h2>Mis pedidos</h2>
      {yo.pedidos.length === 0 ? (
        <p>
          Todavía no tienes pedidos. <a href="/">Ver productos</a>
        </p>
      ) : (
        <ul className="lista-carrito">
          {yo.pedidos.map((p) => (
            <li key={p.id} className="panel pedido">
              <div className="pedido-cabecera">
                <strong>Pedido #{p.id}</strong>
                <span>{new Date(p.fecha + 'T12:00').toLocaleDateString('es-MX', { dateStyle: 'long' })}</span>
                <span className="categoria-tag">{ESTADOS[p.status]}</span>
                <strong>{dinero(p.total)}</strong>
              </div>
              <ul className="pedido-detalles">
                {p.detalles.map((d) => (
                  <li key={d.producto.id}>
                    {d.cantidad} × <a href={`/producto/${d.producto.id}`}>{d.producto.nombre}</a> — {dinero(d.subtotal)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
