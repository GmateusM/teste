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

-- Tabela para armazenar os produtos do cardápio
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    old_price DECIMAL(10, 2),
    image VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    promo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os pedidos
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- Pode ser nulo para pedidos de visitantes
    total DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    reward_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para associar os produtos a cada pedido (Itens do Pedido)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Pode ser nulo se o produto for excluído
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL, -- Preço no momento da compra
    name VARCHAR(255) NOT NULL -- Nome do produto no momento da compra
);

-- Índices para otimizar as pesquisas
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);