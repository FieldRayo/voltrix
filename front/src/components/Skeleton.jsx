// src/components/Skeleton.jsx
// Skeleton simple: unas cajitas grises "pulsando" mientras llega la data del backend.
export default function Skeleton({ cantidad = 4 }) {
  return (
    <div className="grid-productos">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-img" />
          <div className="skeleton-linea" />
          <div className="skeleton-linea corta" />
        </div>
      ))}
    </div>
  )
}
