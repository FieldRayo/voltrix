// src/components/Sidebar.jsx
export default function Sidebar({ categorias, onSeleccionar }) {
  return (
    <aside className="sidebar">
      <h3>Categorías</h3>
      <ul>
        {categorias.map((cat) => (
          <li key={cat.id}>
            <button onClick={() => onSeleccionar(cat.id)}>{cat.nombre}</button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
