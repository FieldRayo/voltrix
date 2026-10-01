// src/components/Home.jsx
import { useEffect, useState } from 'react'
import { obtenerTodosLosProductos } from '../api/graphql.js'
import Hero from './Hero.jsx'
import ProductCard from './ProductCard.jsx'
import Skeleton from './Skeleton.jsx'

export default function Home({ onVerDetalle }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    obtenerTodosLosProductos()
      .then((data) => setProductos(data))
      .catch((err) => console.error(err))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div>
      <Hero />
      <h2>Todos los productos</h2>

      {cargando ? (
        <Skeleton cantidad={4} />
      ) : (
        <div className="grid-productos">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} onVerDetalle={onVerDetalle} />
          ))}
        </div>
      )}
    </div>
  )
}
