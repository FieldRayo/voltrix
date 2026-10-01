// src/components/CategoriaDetalle.jsx
import { useEffect, useState } from 'react'
import { obtenerProductosPorCategoria } from '../api/graphql.js'
import ProductCard from './ProductCard.jsx'
import Skeleton from './Skeleton.jsx'

export default function CategoriaDetalle({ categoriaId, onVerDetalle }) {
  const [categoria, setCategoria] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    obtenerProductosPorCategoria(categoriaId)
      .then((data) => setCategoria(data))
      .catch((err) => console.error(err))
      .finally(() => setCargando(false))
  }, [categoriaId])

  if (cargando) return <Skeleton cantidad={4} />

  if (!categoria) return <p>No se encontró la categoría.</p>

  return (
    <section>
      <h2>{categoria.nombre}</h2>
      <div className="grid-productos">
        {categoria.productos.map((p) => (
          <ProductCard key={p.id} producto={p} onVerDetalle={onVerDetalle} />
        ))}
      </div>
    </section>
  )
}
