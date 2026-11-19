-- Secure ERP write operations. Functions derive identity from the authenticated JWT
-- and calculate all product prices, costs, totals, and stock changes in PostgreSQL.

insert into public.products (sku, name, category, brand, price, cost_price, stock, min_stock, is_service, is_active)
values
  ('SRV-ACEITE', 'Mano de Obra: Cambio de Aceite y Filtro', 'Mano de Obra', 'Servicio', 15000, 0, 0, 0, true, true),
  ('SRV-PASTILLAS', 'Mano de Obra: Cambio de Pastillas de Freno', 'Mano de Obra', 'Servicio', 20000, 0, 0, 0, true, true)
on conflict (sku) do nothing;

create or replace function public.process_pos_sale(
  p_items jsonb,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_cash_session public.cash_sessions%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_quantity integer;
  v_sale_id uuid := gen_random_uuid();
  v_reference text;
  v_total numeric := 0;
  v_count integer := 0;
begin
  if v_user_id is null or coalesce(v_email, '') = '' then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;
  select role into v_role from public.profiles where id = v_user_id;
  if coalesce(v_role, '') not in ('admin', 'manager') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_payment_method is null or p_payment_method not in ('Efectivo', 'Transferencia', 'Tarjeta') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  select * into v_cash_session
  from public.cash_sessions
  where user_id = v_user_id and status = 'OPEN'
  order by opened_at desc
  limit 1
  for update;
  if not found then
    raise exception 'OPEN_CASH_SESSION_REQUIRED' using errcode = 'P0001';
  end if;

  v_reference := 'VEN-' || upper(substr(replace(v_sale_id::text, '-', ''), 1, 8));

  -- Lock each product row before deriving price/cost and changing stock. A raised
  -- exception rolls back the whole function, including every prior line update.
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 10000 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    if nullif(v_item ->> 'product_id', '') is not null then
      select * into v_product from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active
      for update;
    else
      select * into v_product from public.products
      where sku = (v_item ->> 'sku') and is_active and coalesce(is_service, false)
      for update;
    end if;
    if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
    if not coalesce(v_product.is_service, false) and v_product.stock < v_quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.sku using errcode = 'P0001';
    end if;

    v_total := v_total + v_product.price * v_quantity;
    v_count := v_count + 1;
  end loop;

  insert into public.sales (id, cash_session_id, user_id, reference_document, payment_method, total_amount, cashier_email)
  values (v_sale_id, v_cash_session.id, v_user_id, v_reference, p_payment_method, v_total, v_email);

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 10000 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
    if nullif(v_item ->> 'product_id', '') is not null then
      select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid for update;
    else
      select * into v_product from public.products where sku = (v_item ->> 'sku') and coalesce(is_service, false) for update;
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    values (v_sale_id, v_product.id, v_quantity, v_product.price, case when coalesce(v_product.is_service, false) then 0 else v_product.cost_price end);

    if not coalesce(v_product.is_service, false) then
      update public.products set stock = stock - v_quantity where id = v_product.id;
      insert into public.inventory_transactions
        (product_id, type, quantity, reference_document, cashier_email, unit_cost, sale_group_id, user_id, sale_id)
      values
        (v_product.id, 'SALE_OUT', v_quantity, v_reference, v_email, v_product.cost_price, v_sale_id, v_user_id, v_sale_id);
    end if;
  end loop;

  return jsonb_build_object('success', true, 'sale_id', v_sale_id, 'reference_document', v_reference, 'total_amount', v_total, 'items_count', v_count);
end;
$$;

create or replace function public.register_stock_entry(
  p_product_id uuid,
  p_quantity integer,
  p_reference_document text,
  p_new_sale_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_product public.products%rowtype;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 1 or length(trim(coalesce(p_reference_document, ''))) > 120 then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  select * into v_product from public.products where id = p_product_id and is_active for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_new_sale_price is not null and p_new_sale_price < 0 then raise exception 'INVALID_PRICE' using errcode = '22023'; end if;
  update public.products
    set stock = stock + p_quantity,
        price = coalesce(p_new_sale_price, price)
    where id = p_product_id;
  insert into public.inventory_transactions (product_id, type, quantity, reference_document, cashier_email, unit_cost, user_id)
  values (p_product_id, 'PURCHASE_IN', p_quantity, nullif(trim(p_reference_document), ''), v_email, v_product.cost_price, v_user_id);
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.register_stock_adjustment(
  p_product_id uuid,
  p_quantity integer,
  p_adjustment_type text,
  p_reference_document text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_product public.products%rowtype;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_adjustment_type is null or p_adjustment_type <> 'ADJUSTMENT_IN' then raise exception 'UNSUPPORTED_ADJUSTMENT_TYPE' using errcode = '22023'; end if;
  if p_quantity is null or p_quantity < 1 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
  select * into v_product from public.products where id = p_product_id and is_active for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.products set stock = stock + p_quantity where id = p_product_id;
  insert into public.inventory_transactions (product_id, type, quantity, reference_document, cashier_email, unit_cost, user_id)
  values (p_product_id, 'ADJUSTMENT_IN', p_quantity, nullif(trim(p_reference_document), ''), v_email, v_product.cost_price, v_user_id);
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.close_cash_session(p_cash_session_id uuid, p_monto_final_real numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_session public.cash_sessions%rowtype;
  v_efectivo numeric;
  v_sistema numeric;
  v_diferencia numeric;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_monto_final_real is null or p_monto_final_real < 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  select * into v_session from public.cash_sessions
  where id = p_cash_session_id and user_id = v_user_id and status = 'OPEN'
  for update;
  if not found then raise exception 'OPEN_CASH_SESSION_NOT_FOUND' using errcode = 'P0002'; end if;

  select coalesce(sum(total_amount), 0) into v_efectivo from public.sales
  where cash_session_id = v_session.id and payment_method = 'Efectivo';
  v_sistema := v_efectivo;
  v_diferencia := p_monto_final_real - v_sistema;
  update public.cash_sessions set
    closed_at = now(), monto_final_sistema = v_sistema,
    monto_final_real = p_monto_final_real, diferencia = v_diferencia, status = 'CLOSED'
  where id = v_session.id;
  return jsonb_build_object('success', true, 'monto_final_sistema', v_sistema, 'monto_final_real', p_monto_final_real, 'diferencia', v_diferencia);
end;
$$;

create or replace function public.open_cash_session(p_monto_inicial numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_session public.cash_sessions%rowtype;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') or coalesce(v_email, '') = '' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_monto_inicial is null or p_monto_inicial < 0 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if exists (select 1 from public.cash_sessions where user_id = v_user_id and status = 'OPEN') then
    raise exception 'OPEN_CASH_SESSION_EXISTS' using errcode = 'P0001';
  end if;
  insert into public.cash_sessions (monto_inicial, monto_final_sistema, cashier_email, user_id, status)
  values (p_monto_inicial, p_monto_inicial, v_email, v_user_id, 'OPEN')
  returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.register_expense(
  p_category text,
  p_amount numeric,
  p_description text,
  p_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_session public.cash_sessions%rowtype;
  v_expense public.expenses%rowtype;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') or coalesce(v_email, '') = '' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if length(trim(coalesce(p_category, ''))) = 0 or length(p_category) > 100 or p_amount is null or p_amount <= 0 or p_amount > 1000000000 then
    raise exception 'INVALID_EXPENSE' using errcode = '22023';
  end if;
  select * into v_session from public.cash_sessions
  where user_id = v_user_id and status = 'OPEN'
  order by opened_at desc limit 1 for update;
  insert into public.expenses (category, amount, description, date, cashier_email, user_id, cash_session_id)
  values (trim(p_category), p_amount, nullif(trim(p_description), ''), coalesce(p_date, now()), v_email, v_user_id, v_session.id)
  returning * into v_expense;
  return jsonb_build_object('success', true, 'id', v_expense.id);
end;
$$;

create or replace function public.register_product(
  p_sku text,
  p_name text,
  p_category text,
  p_brand text,
  p_part_number_factory text,
  p_price numeric,
  p_stock integer,
  p_min_stock integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_role text;
  v_product public.products%rowtype;
begin
  select role into v_role from public.profiles where id = v_user_id;
  if v_user_id is null or coalesce(v_role, '') not in ('admin', 'manager') or coalesce(v_email, '') = '' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if length(trim(coalesce(p_sku, ''))) < 2 or length(p_sku) > 30
     or length(trim(coalesce(p_name, ''))) < 3 or length(p_name) > 120
     or length(trim(coalesce(p_category, ''))) = 0 or length(p_category) > 100
     or length(trim(coalesce(p_brand, ''))) < 2 or length(p_brand) > 100
     or p_price is null or p_price <= 0
     or p_stock is null or p_stock < 0
     or p_min_stock is null or p_min_stock < 0 then
    raise exception 'INVALID_PRODUCT' using errcode = '22023';
  end if;
  insert into public.products (sku, name, category, brand, part_number_factory, price, stock, min_stock, cost_price, is_service, is_active)
  values (upper(trim(p_sku)), trim(p_name), trim(p_category), trim(p_brand), nullif(trim(p_part_number_factory), ''), p_price, p_stock, p_min_stock, 0, false, true)
  returning * into v_product;
  if p_stock > 0 then
    insert into public.inventory_transactions (product_id, type, quantity, reference_document, cashier_email, unit_cost, user_id)
    values (v_product.id, 'PURCHASE_IN', p_stock, 'APERTURA-' || upper(substr(replace(v_product.id::text, '-', ''), 1, 8)), v_email, v_product.cost_price, v_user_id);
  end if;
  return jsonb_build_object('success', true, 'id', v_product.id);
end;
$$;

revoke all on function public.process_pos_sale(jsonb, text) from public, anon;
revoke all on function public.register_stock_entry(uuid, integer, text, numeric) from public, anon;
revoke all on function public.register_stock_adjustment(uuid, integer, text, text) from public, anon;
revoke all on function public.close_cash_session(uuid, numeric) from public, anon;
revoke all on function public.open_cash_session(numeric) from public, anon;
revoke all on function public.register_expense(text, numeric, text, timestamptz) from public, anon;
revoke all on function public.register_product(text, text, text, text, text, numeric, integer, integer) from public, anon;
grant execute on function public.process_pos_sale(jsonb, text) to authenticated;
grant execute on function public.register_stock_entry(uuid, integer, text, numeric) to authenticated;
grant execute on function public.register_stock_adjustment(uuid, integer, text, text) to authenticated;
grant execute on function public.close_cash_session(uuid, numeric) to authenticated;
grant execute on function public.open_cash_session(numeric) to authenticated;
grant execute on function public.register_expense(text, numeric, text, timestamptz) to authenticated;
grant execute on function public.register_product(text, text, text, text, text, numeric, integer, integer) to authenticated;
