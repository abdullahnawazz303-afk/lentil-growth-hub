-- ============================================================
-- Public Orders RPC Migration
-- Run this in Supabase SQL Editor
-- This allows unauthenticated users to safely submit and track
-- orders using their phone number, bypassing RLS securely.
-- ============================================================

-- 1. Function to submit an order
CREATE OR REPLACE FUNCTION submit_public_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: runs as postgres to bypass RLS
AS $$
DECLARE
  v_phone text;
  v_name text;
  v_email text;
  v_address text;
  v_lat numeric;
  v_lng numeric;
  v_location_url text;
  v_items jsonb;
  
  v_customer_id uuid;
  v_order_id uuid;
  v_order_ref text;
  v_total_amount numeric := 0;
  v_item jsonb;
BEGIN
  v_phone := payload->>'phone';
  v_name := payload->>'name';
  v_email := payload->>'email';
  v_address := payload->>'address';
  v_location_url := payload->>'locationUrl';
  v_lat := (payload->>'lat')::numeric;
  v_lng := (payload->>'lng')::numeric;
  v_items := payload->'items';

  -- Calculate total amount
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_total_amount := v_total_amount + (v_item->>'quantity_kg')::numeric;
  END LOOP;

  -- Check if phone belongs to customer
  SELECT id INTO v_customer_id FROM customers WHERE phone = v_phone LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    -- Insert into online_orders
    INSERT INTO online_orders (customer_id, total_amount, status, notes)
    VALUES (
      v_customer_id, 
      v_total_amount, 
      'Pending', 
      'Public Checkout by ' || v_name || ' - Location: ' || COALESCE(v_location_url, 'N/A')
    )
    RETURNING id, order_ref INTO v_order_id, v_order_ref;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      INSERT INTO online_order_items (order_id, item_name, grade, packing, quantity_kg)
      VALUES (
        v_order_id,
        v_item->>'item_name',
        v_item->>'grade',
        (v_item->>'packing')::numeric,
        (v_item->>'quantity_kg')::numeric
      );
    END LOOP;

    RETURN jsonb_build_object(
      'success', true, 
      'order_ref', v_order_ref, 
      'type', 'customer', 
      'customer_id', v_customer_id
    );

  ELSE
    -- Insert into guest_orders
    v_order_id := gen_random_uuid();
    INSERT INTO guest_orders (
      id, guest_name, guest_phone, guest_email, 
      guest_address, guest_location_url, guest_lat, guest_lng, 
      total_amount, status
    )
    VALUES (
      v_order_id, v_name, v_phone, v_email, 
      v_address, v_location_url, v_lat, v_lng, 
      v_total_amount, 'Pending'
    )
    RETURNING order_ref INTO v_order_ref;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      INSERT INTO guest_order_items (order_id, item_name, urdu_name, grade, packing, quantity_kg)
      VALUES (
        v_order_id,
        v_item->>'english_name', -- fallback to english_name or item_name
        v_item->>'item_name',
        v_item->>'grade',
        (v_item->>'packing')::text,
        (v_item->>'quantity_kg')::numeric
      );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'order_ref', v_order_ref, 'type', 'guest');
  END IF;
END;
$$;


-- 2. Function to securely track orders
CREATE OR REPLACE FUNCTION track_public_orders(p_phone text, p_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_clean_phone text;
BEGIN
  v_clean_phone := replace(replace(p_phone, ' ', ''), '-', '');

  IF v_clean_phone = '' THEN
    RETURN v_result;
  END IF;

  WITH guest_matches AS (
    SELECT 
      g.id,
      g.order_ref,
      g.guest_name,
      g.guest_phone,
      g.status,
      g.notes,
      g.total_amount,
      g.created_at,
      'guest' as type,
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', gi.id,
            'item_name', gi.item_name,
            'urdu_name', gi.urdu_name,
            'grade', gi.grade,
            'packing', gi.packing,
            'quantity_kg', gi.quantity_kg
          )
        ) FROM guest_order_items gi WHERE gi.order_id = g.id),
        '[]'::jsonb
      ) as order_items
    FROM guest_orders g
    WHERE g.guest_phone ILIKE '%' || v_clean_phone || '%'
      AND (p_ref IS NULL OR p_ref = '' OR g.order_ref ILIKE '%' || p_ref || '%')
  ),
  customer_matches AS (
    SELECT 
      o.id,
      o.order_ref,
      c.name as guest_name,
      c.phone as guest_phone,
      o.status,
      o.notes,
      o.total_amount,
      o.created_at,
      'online' as type,
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'item_name', oi.item_name,
            'urdu_name', NULL,
            'grade', oi.grade,
            'packing', oi.packing,
            'quantity_kg', oi.quantity_kg
          )
        ) FROM online_order_items oi WHERE oi.order_id = o.id),
        '[]'::jsonb
      ) as order_items
    FROM online_orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE c.phone ILIKE '%' || v_clean_phone || '%'
      AND (p_ref IS NULL OR p_ref = '' OR o.order_ref ILIKE '%' || p_ref || '%')
  )
  SELECT COALESCE(jsonb_agg(row_to_json(combined)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT * FROM guest_matches
    UNION ALL
    SELECT * FROM customer_matches
  ) combined;

  RETURN v_result;
END;
$$;
