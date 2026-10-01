// src/components/ProductoDetalle.jsx
import { useEffect, useState } from 'react'
import { obtenerProducto } from '../api/graphql.js'
import { useCart } from '../context/CartContext.jsx'

export default function ProductoDetalle({ productoId, irA }) {
  const [producto, setProducto] = useState(null)
  const [cargando, setCargando] = useState(true)
  const { agregarAlCarrito } = useCart()

  useEffect(() => {
    setCargando(true)
    obtenerProducto(productoId)
      .then((data) => setProducto(data))
      .finally(() => setCargando(false))
  }, [productoId])

  if (cargando) return <p>Cargando producto...</p>
  if (!producto) return <p>Producto no encontrado.</p>

  const handleAgregar = () => {
    agregarAlCarrito(producto)
    irA('carrito')
  }

  return (
    <section className="producto-detalle">
      <button className="volver" onClick={() => irA('home')}>
        Volver
      </button>

      <div className="producto-detalle-img">
        {producto.imagen && <img src={producto.imagen} alt={producto.nombre} />}
      </div>

      <div className="producto-detalle-info">
        <h2>{producto.nombre}</h2>
        {producto.categoria && <p className="categoria-tag">{producto.categoria.nombre}</p>}
        <p className="precio">${Number(producto.precio).toFixed(2)}</p>
        {producto.especificaciones && <p className="especificaciones">{producto.especificaciones}</p>}
        <p>{producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin existencias'}</p>
        <button className="btn-primario" disabled={producto.stock < 1} onClick={handleAgregar}>
          {producto.stock > 0 ? 'Agregar al carrito' : 'Sin existencias'}
        </button>
      </div>
    </section>
  )
}
