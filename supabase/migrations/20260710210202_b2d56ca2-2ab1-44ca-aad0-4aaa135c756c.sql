
-- Add cylinder-booking fields to orders (additive, all nullable/defaulted)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS consumer_number text,
  ADD COLUMN IF NOT EXISTS preferred_delivery_date date;

-- Optional constraint for order_type values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_type_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('standard','cylinder_booking'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_customer_type_idx ON public.orders (customer_id, order_type);
