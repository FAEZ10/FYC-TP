CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock) VALUES
  ('MacBook Pro M3', 'Ordinateur portable haute performance pour développeurs', 2499.00, 15),
  ('iPhone 15 Pro', 'Smartphone dernière génération avec puce A17', 1299.00, 50),
  ('AirPods Pro 2', 'Écouteurs sans fil avec réduction de bruit active', 279.00, 100),
  ('Magic Mouse', 'Souris sans fil élégante et ergonomique', 89.00, 75),
  ('Apple Watch Series 9', 'Montre connectée avec capteurs santé avancés', 449.00, 30);
