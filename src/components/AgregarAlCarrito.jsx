import { useState } from 'react'
import { despachar, useCarrito } from '../lib/carrito.js'

export default function AgregarAlCarrito({ producto }) {
  const { items } = useCarrito()
  const [agregado, setAgregado] = useState(false)
  const enCarrito = items.find((it) => it.id === producto.id)?.cantidad || 0
  const agotado = producto.stock < 1
  const enTope = enCarrito >= producto.stock

  const agregar = () => {
    despachar({ type: 'AGREGAR', payload: producto })
    setAgregado(true)
  }

  return (
    <div className="agregar">
      <button className="btn-primario" type="button" disabled={agotado || enTope} onClick={agregar}>
        {agotado ? 'Sin existencias' : enTope ? 'Ya tienes todo el stock' : 'Agregar al carrito'}
      </button>
      {agregado && enCarrito > 0 && (
        <p className="aviso" role="status">
          Tienes {enCarrito} en tu carrito. <a href="/carrito">Ver carrito</a>
        </p>
      )}
    </div>
  )
}
