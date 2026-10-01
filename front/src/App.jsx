// src/App.jsx
// Máquina de estados simple del flujo:
// home -> categoria -> producto -> carrito -> checkout (+ equipo)
// Todo se controla con "vista" (estado) y funciones que la cambian (eventos),
// sin usar react-router ni URLs.
import { useEffect, useState } from 'react'
import { obtenerCategorias } from './api/graphql.js'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Footer from './components/Footer.jsx'
import Home from './components/Home.jsx'
import CategoriaDetalle from './components/CategoriaDetalle.jsx'
import ProductoDetalle from './components/ProductoDetalle.jsx'
import Carrito from './components/Carrito.jsx'
import Checkout from './components/Checkout.jsx'
import Equipo from './components/Equipo.jsx'

export default function App() {
  const [vista, setVista] = useState('home') // home | categoria | producto | carrito | checkout | equipo
  const [categoriaId, setCategoriaId] = useState(null)
  const [productoId, setProductoId] = useState(null)
  const [categorias, setCategorias] = useState([])

  // Cargamos las categorías una sola vez para el sidebar (context = layout compartido)
  useEffect(() => {
    obtenerCategorias().then(setCategorias).catch(console.error)
  }, [])

  // "Eventos" de la máquina de estados
  const irA = (nuevaVista) => setVista(nuevaVista)

  const verCategoria = (id) => {
    setCategoriaId(id)
    setVista('categoria')
  }

  const verProducto = (id) => {
    setProductoId(id)
    setVista('producto')
  }

  const renderContenido = () => {
    switch (vista) {
      case 'categoria':
        return <CategoriaDetalle categoriaId={categoriaId} onVerDetalle={verProducto} />
      case 'producto':
        return <ProductoDetalle productoId={productoId} irA={irA} />
      case 'carrito':
        return <Carrito irA={irA} />
      case 'checkout':
        return <Checkout irA={irA} />
      case 'equipo':
        return <Equipo />
      case 'home':
      default:
        return <Home onVerDetalle={verProducto} />
    }
  }

  return (
    <div className="app-layout">
      <TopBar irA={irA} />

      <div className="app-body">
        <Sidebar categorias={categorias} onSeleccionar={verCategoria} />
        <main className="app-main">{renderContenido()}</main>
      </div>

      <Footer />
    </div>
  )
}
