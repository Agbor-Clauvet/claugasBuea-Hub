-- Correct the seeded placeholder catalog to match real ClauGas products:
-- all cylinders are 12.5kg, differentiated by color, with real prices.
-- Uses UPDATE (not delete+insert) so existing orders/order_items keep
-- working — order_items already stores a unit_price snapshot, so past
-- orders are unaffected by this price change.

UPDATE public.cylinders
SET name = 'ClauGas 12.5kg — Red',
    size_kg = 12.5,
    description = '12.5kg LPG cylinder — red variant. Reliable everyday cooking gas.',
    price = 8000
WHERE name = 'Small Cylinder';

UPDATE public.cylinders
SET name = 'ClauGas 12.5kg — Yellow',
    size_kg = 12.5,
    description = '12.5kg LPG cylinder — yellow variant. Reliable everyday cooking gas.',
    price = 7500
WHERE name = 'Medium Cylinder';

UPDATE public.cylinders
SET name = 'ClauGas 12.5kg — Green',
    size_kg = 12.5,
    description = '12.5kg LPG cylinder — green variant. Reliable everyday cooking gas.',
    price = 7500
WHERE name = 'Large Cylinder';
