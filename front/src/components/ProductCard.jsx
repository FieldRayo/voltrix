// src/components/ProductCard.jsx
export default function ProductCard({ producto, onVerDetalle }) {
  return (
    <div className="producto-card" onClick={() => onVerDetalle(producto.id)}>
      <div className="producto-img">
        {producto.imagen && <img src={producto.imagen} alt={producto.nombre} />}
      </div>
      <h4>{producto.nombre}</h4>
      <p className="precio">${Number(producto.precio).toFixed(2)}</p>
      <p className="stock">{producto.stock} disponibles</p>
    </div>
  )
}
