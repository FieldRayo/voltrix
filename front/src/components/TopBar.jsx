// src/components/TopBar.jsx
import { useCart } from '../context/CartContext.jsx'

export default function TopBar({ irA }) {
  const { totalItems } = useCart()

  return (
    <header className="topbar">
      <div className="topbar-logo" onClick={() => irA('home')}>
        VOLTRIX
      </div>

      <nav className="topbar-nav">
        <button onClick={() => irA('home')}>Home</button>
        <button onClick={() => irA('equipo')}>Equipo</button>
        <button className="topbar-carrito" onClick={() => irA('carrito')}>
          Carrito
          {totalItems > 0 && <span className="badge">{totalItems}</span>}
        </button>
      </nav>
    </header>
  )
}
