-- =========================================================================
-- Migration: Real-Time Inventory & Stock Management System
-- Safe to run multiple times in Supabase SQL Editor
-- =========================================================================

-- 1. Ensure stock_deducted flag on orders table to prevent double deduction
alter table public.orders 
  add column if not exists stock_deducted boolean not null default false;

-- 2. SQL Function: Deduct stock for an item (product + optional variant)
create or replace function public.deduct_product_stock(
  p_product_id uuid,
  p_quantity int,
  p_variant_name text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_stock int;
  v_new_stock int;
  v_new_status text;
  v_variants jsonb;
  v_updated_variants jsonb;
  v_elem jsonb;
begin
  -- Fetch current product data
  select stock, coalesce(variants, '[]'::jsonb)
  into v_current_stock, v_variants
  from public.products
  where id = p_product_id;

  if not found then
    return;
  end if;

  -- Compute new product stock
  v_new_stock := greatest(0, coalesce(v_current_stock, 0) - p_quantity);
  
  -- Determine new stock status
  if v_new_stock = 0 then
    v_new_status := 'out_of_stock';
  elsif v_new_stock <= 3 then
    v_new_status := 'few_units_left';
  else
    v_new_status := 'in_stock';
  end if;

  -- If variant name provided, update that variant's stock in jsonb
  v_updated_variants := '[]'::jsonb;
  if p_variant_name is not null and jsonb_array_length(v_variants) > 0 then
    for v_elem in select * from jsonb_array_elements(v_variants) loop
      if (v_elem->>'name') = p_variant_name or (v_elem->>'id') = p_variant_name then
        v_elem := jsonb_set(
          v_elem, 
          '{stock}', 
          to_jsonb(greatest(0, coalesce((v_elem->>'stock')::int, 0) - p_quantity))
        );
      end if;
      v_updated_variants := v_updated_variants || jsonb_build_array(v_elem);
    end loop;
  else
    v_updated_variants := v_variants;
  end if;

  -- Apply updates to products table
  update public.products
  set 
    stock = v_new_stock,
    stock_status = v_new_status,
    variants = v_updated_variants,
    updated_at = now()
  where id = p_product_id;
end;
$$;

-- 3. SQL Function: Restore stock for an item on order cancellation
create or replace function public.restore_product_stock(
  p_product_id uuid,
  p_quantity int,
  p_variant_name text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_stock int;
  v_new_stock int;
  v_new_status text;
  v_variants jsonb;
  v_updated_variants jsonb;
  v_elem jsonb;
begin
  select stock, coalesce(variants, '[]'::jsonb)
  into v_current_stock, v_variants
  from public.products
  where id = p_product_id;

  if not found then
    return;
  end if;

  v_new_stock := coalesce(v_current_stock, 0) + p_quantity;
  
  if v_new_stock = 0 then
    v_new_status := 'out_of_stock';
  elsif v_new_stock <= 3 then
    v_new_status := 'few_units_left';
  else
    v_new_status := 'in_stock';
  end if;

  v_updated_variants := '[]'::jsonb;
  if p_variant_name is not null and jsonb_array_length(v_variants) > 0 then
    for v_elem in select * from jsonb_array_elements(v_variants) loop
      if (v_elem->>'name') = p_variant_name or (v_elem->>'id') = p_variant_name then
        v_elem := jsonb_set(
          v_elem, 
          '{stock}', 
          to_jsonb(coalesce((v_elem->>'stock')::int, 0) + p_quantity)
        );
      end if;
      v_updated_variants := v_updated_variants || jsonb_build_array(v_elem);
    end loop;
  else
    v_updated_variants := v_variants;
  end if;

  update public.products
  set 
    stock = v_new_stock,
    stock_status = v_new_status,
    variants = v_updated_variants,
    updated_at = now()
  where id = p_product_id;
end;
$$;
