-- Remove the check constraint on category to allow free-form categories
ALTER TABLE public.price_items DROP CONSTRAINT IF EXISTS price_items_category_check;