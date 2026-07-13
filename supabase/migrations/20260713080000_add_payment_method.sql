-- Add payment_method to orders. Only free/manual payment options for now
-- (Cash on Delivery, or Mobile Money paid directly to the rider) since
-- MTN MoMo / Orange Money collections APIs require paid merchant setup.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash_on_delivery';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash_on_delivery', 'mobile_money'));
  END IF;
END $$;
