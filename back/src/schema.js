// src/schema.js
export const typeDefs = `#graphql
  """Categoría a la que pertenece un producto."""
  type Categoria {
    id: ID!
    nombre: String!
    descripcion: String
    productos: [Producto!]!
  }

  """Producto disponible en el e-commerce."""
  type Producto {
    id: ID!
    nombre: String!
    precio: Float!
    imagen: String
    especificaciones: String
    stock: Int!
    categoria: Categoria
  }

  """Rol que puede tener un usuario."""
  enum Rol {
    CLIENTE
    ADMIN
  }

  """Usuario registrado en el e-commerce."""
  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Rol!
    pedidos: [Pedido!]!
  }

  """Estado en el que se encuentra un pedido."""
  enum StatusPedido {
    PENDIENTE
    PAGADO
    ENVIADO
    ENTREGADO
    CANCELADO
  }

  """Un renglón del pedido: un producto + la cantidad comprada."""
  type DetallePedido {
    id: ID!
    producto: Producto!
    cantidad: Int!
    subtotal: Float!
  }

  """Pedido realizado por un usuario."""
  type Pedido {
    id: ID!
    fecha: String!
    total: Float!
    status: StatusPedido!
    usuario: Usuario
    detalles: [DetallePedido!]!
  }

  """Datos de entrada para crear/actualizar un producto."""
  input ProductoInput {
    nombre: String!
    precio: Float!
    imagen: String
    especificaciones: String
    categoriaId: ID
    stock: Int!
  }

  """Un producto + cantidad dentro de un pedido nuevo (carrito)."""
  input ItemPedidoInput {
    productoId: ID!
    cantidad: Int!
  }

  """Datos de entrada para registrar un pedido (checkout)."""
  input PedidoInput {
    usuarioId: ID!
    items: [ItemPedidoInput!]!
  }

  """Operaciones de lectura."""
  type Query {
    productos(limite: Int, desde: Int): [Producto!]!
    producto(id: ID!): Producto
    categorias: [Categoria!]!
    categoria(id: ID!): Categoria
    usuarios: [Usuario!]!
    pedidos: [Pedido!]!
    pedido(id: ID!): Pedido
  }

  """Operaciones de escritura."""
  type Mutation {
    # CRUD de producto
    crearProducto(datos: ProductoInput!): Producto
    actualizarProducto(id: ID!, datos: ProductoInput!): Producto
    eliminarProducto(id: ID!): Boolean

    # Registrar un pedido (checkout del carrito)
    crearPedido(datos: PedidoInput!): Pedido
  }
`
