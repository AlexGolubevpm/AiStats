-- Widen ctr and fillRate columns from Decimal(6,4) to Decimal(8,4)
-- to prevent numeric overflow when values reach 100.0000

ALTER TABLE "daily_metrics"
  ALTER COLUMN "ctr" TYPE DECIMAL(8, 4),
  ALTER COLUMN "fillRate" TYPE DECIMAL(8, 4);

ALTER TABLE "format_metrics"
  ALTER COLUMN "ctr" TYPE DECIMAL(8, 4),
  ALTER COLUMN "fillRate" TYPE DECIMAL(8, 4);

ALTER TABLE "tier_metrics"
  ALTER COLUMN "ctr" TYPE DECIMAL(8, 4),
  ALTER COLUMN "fillRate" TYPE DECIMAL(8, 4);
