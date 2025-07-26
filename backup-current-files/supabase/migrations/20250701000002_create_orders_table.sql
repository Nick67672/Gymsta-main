-- Create the orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    shipping_address text,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    tracking_number text,
    carrier text,
    tracking_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments to the columns
COMMENT ON COLUMN public.orders.status IS 'The current status of the order';
COMMENT ON COLUMN public.orders.tracking_number IS 'The tracking number provided by the carrier';
COMMENT ON COLUMN public.orders.carrier IS 'The shipping carrier (e.g., UPS, FedEx, USPS)';
COMMENT ON COLUMN public.orders.tracking_url IS 'A direct URL to track the shipment';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- 1. Sellers can view their own orders.
CREATE POLICY "Sellers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- 2. Buyers can view their own orders.
CREATE POLICY "Buyers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- 3. Sellers can update their orders (e.g., to add tracking info or update status).
CREATE POLICY "Sellers can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- 4. Authenticated users can create orders (as buyers).
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- 5. Allow buyers to cancel their own PENDING orders
CREATE POLICY "Buyers can cancel their own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid() AND status = 'pending')
WITH CHECK (status = 'cancelled'); 