-- ERP TITO: baseline de seguridad y rendimiento.
-- Aplicar con Supabase CLI en un entorno controlado y revisar el esquema existente
-- antes de promover a producción.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('admin', 'cashier', 'auditor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.has_erp_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any(required_roles)
  );
$$;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles for select to authenticated
using (id = auth.uid() or public.has_erp_role(array['admin']));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['products', 'inventory_transactions', 'expenses', 'cash_sessions']
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    drop policy if exists "products_staff_read" on public.products;
    create policy "products_staff_read" on public.products
      for select to authenticated
      using (public.has_erp_role(array['admin', 'cashier', 'auditor']));

    drop policy if exists "products_admin_write" on public.products;
    create policy "products_admin_write" on public.products
      for all to authenticated
      using (public.has_erp_role(array['admin']))
      with check (public.has_erp_role(array['admin']));
  end if;

  if to_regclass('public.inventory_transactions') is not null then
    drop policy if exists "inventory_staff_read" on public.inventory_transactions;
    create policy "inventory_staff_read" on public.inventory_transactions
      for select to authenticated
      using (public.has_erp_role(array['admin', 'cashier', 'auditor']));

    drop policy if exists "inventory_server_insert" on public.inventory_transactions;
    create policy "inventory_server_insert" on public.inventory_transactions
      for insert to authenticated
      with check (public.has_erp_role(array['admin', 'cashier']));
  end if;

  if to_regclass('public.expenses') is not null then
    drop policy if exists "expenses_staff_read" on public.expenses;
    create policy "expenses_staff_read" on public.expenses
      for select to authenticated
      using (public.has_erp_role(array['admin', 'cashier', 'auditor']));

    drop policy if exists "expenses_cashier_insert" on public.expenses;
    create policy "expenses_cashier_insert" on public.expenses
      for insert to authenticated
      with check (public.has_erp_role(array['admin', 'cashier']));
  end if;

  if to_regclass('public.cash_sessions') is not null then
    drop policy if exists "cash_staff_read" on public.cash_sessions;
    create policy "cash_staff_read" on public.cash_sessions
      for select to authenticated
      using (public.has_erp_role(array['admin', 'cashier', 'auditor']));

    drop policy if exists "cashier_open" on public.cash_sessions;
    create policy "cashier_open" on public.cash_sessions
      for insert to authenticated
      with check (public.has_erp_role(array['admin', 'cashier']));

    drop policy if exists "cashier_close" on public.cash_sessions;
    create policy "cashier_close" on public.cash_sessions
      for update to authenticated
      using (public.has_erp_role(array['admin', 'cashier']))
      with check (public.has_erp_role(array['admin', 'cashier']));
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    create index if not exists products_is_service_stock_idx
      on public.products (is_service, stock);
  end if;
  if to_regclass('public.inventory_transactions') is not null then
    create index if not exists inventory_transactions_product_created_idx
      on public.inventory_transactions (product_id, created_at desc);
    create index if not exists inventory_transactions_type_created_idx
      on public.inventory_transactions (type, created_at desc);
  end if;
  if to_regclass('public.expenses') is not null then
    create index if not exists expenses_date_idx
      on public.expenses (date desc);
  end if;
  if to_regclass('public.cash_sessions') is not null then
    create unique index if not exists cash_sessions_one_open_idx
      on public.cash_sessions (status)
      where status = 'OPEN';
  end if;
end;
$$;

-- Importante: las RPC financieras deben vivir en migraciones separadas y calcular
-- precios, totales, stock y diferencias dentro de PostgreSQL. Nunca confiar en
-- valores monetarios enviados por el navegador.
