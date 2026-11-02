-- The catalogue now follows GROSS's website, which publishes no prices or stock levels.
-- Clears the sample values so customers see "Price on request" until staff enter real ones.
-- Existing orders keep the prices saved on them.
ALTER TABLE parts ALTER COLUMN price DROP NOT NULL;
ALTER TABLE parts ALTER COLUMN availability DROP NOT NULL;
ALTER TABLE parts ALTER COLUMN availability DROP DEFAULT;
UPDATE parts SET price = NULL, availability = NULL, lead_time_days = NULL;
