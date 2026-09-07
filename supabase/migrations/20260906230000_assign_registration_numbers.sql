create sequence if not exists public.leitores_numero_cadastro_seq;
create sequence if not exists public.livros_numero_cadastro_seq;

select setval(
  'public.leitores_numero_cadastro_seq',
  greatest(
    coalesce(max(numero_cadastro::bigint) filter (where btrim(numero_cadastro) ~ '^[0-9]+$'), 0),
    1
  ),
  true
)
from public.leitores;

select setval(
  'public.livros_numero_cadastro_seq',
  greatest(
    coalesce(max(numero_cadastro::bigint) filter (where btrim(numero_cadastro) ~ '^[0-9]+$'), 0),
    1
  ),
  true
)
from public.livros;

create or replace function public.assign_leitor_numero_cadastro()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero_cadastro is null or btrim(new.numero_cadastro) = '' then
    new.numero_cadastro := nextval('public.leitores_numero_cadastro_seq')::text;
  end if;
  return new;
end;
$$;

create or replace function public.assign_livro_numero_cadastro()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.numero_cadastro is null or btrim(new.numero_cadastro) = '' then
    new.numero_cadastro := nextval('public.livros_numero_cadastro_seq')::text;
  end if;
  return new;
end;
$$;

drop trigger if exists leitores_assign_numero_cadastro on public.leitores;
create trigger leitores_assign_numero_cadastro
before insert on public.leitores
for each row execute function public.assign_leitor_numero_cadastro();

drop trigger if exists livros_assign_numero_cadastro on public.livros;
create trigger livros_assign_numero_cadastro
before insert on public.livros
for each row execute function public.assign_livro_numero_cadastro();
