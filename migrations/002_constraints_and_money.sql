-- Money as exact decimals, and rules the application already relies on
ALTER TABLE parts ALTER COLUMN price TYPE NUMERIC(10, 2);
ALTER TABLE parts ALTER COLUMN price SET NOT NULL;
ALTER TABLE parts ALTER COLUMN availability SET NOT NULL;
ALTER TABLE parts ALTER COLUMN visible SET NOT NULL;
ALTER TABLE parts ADD CONSTRAINT parts_price_check CHECK (price >= 0);
ALTER TABLE parts ADD CONSTRAINT parts_availability_check CHECK (availability IN ('in-stock', 'low-stock', 'on-order'));

ALTER TABLE order_items ALTER COLUMN unit_price TYPE NUMERIC(10, 2);
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);

ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('new', 'processing', 'shipped', 'cancelled'));

CREATE INDEX IF NOT EXISTS modules_machine_type_id_idx ON modules (machine_type_id);
CREATE INDEX IF NOT EXISTS parts_module_id_idx ON parts (module_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS orders_serial_number_idx ON orders (serial_number);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at);
