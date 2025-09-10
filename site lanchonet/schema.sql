-- Habilita a extensão para gerar UUIDs, uma alternativa moderna para IDs numéricos.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar os utilizadores
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    loyalty_stamps INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar as categorias dos produtos
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_order INTEGER DEFAULT 0, -- Para controlar a ordem de exibição no menu
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os produtos do cardápio
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2),
    image VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- Alterado para referenciar a nova tabela
    promo BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE, -- NOVO: Para "apagar" produtos sem os remover
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os pedidos
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- Pode ser nulo para pedidos de visitantes
    total DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Recebido', -- NOVO: Status do pedido
    reward_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para associar os produtos a cada pedido (Itens do Pedido)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Comportamento explicitado
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL, -- Preço no momento da compra
    name VARCHAR(255) NOT NULL -- Nome do produto no momento da compra
);

-- Índices para otimizar as pesquisas
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
