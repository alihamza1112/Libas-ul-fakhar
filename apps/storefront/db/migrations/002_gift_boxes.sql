-- Tohfa-e-Khaas gift boxes.
-- products.bundle: {items: [{productId, sku, qty}], pricing: {mode: "fixed"} | {mode: "discount", percent}}
-- order_items.components: what was packed for a box line [{sku, name, colour, size, qty}] (qty per box),
-- so picking, shipping and restocking work even if the box is later edited.

ALTER TABLE products ADD COLUMN bundle jsonb;
ALTER TABLE order_items ADD COLUMN components jsonb;
