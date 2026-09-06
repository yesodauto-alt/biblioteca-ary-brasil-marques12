-- Completa os metadados do acervo e cria a fila de conciliação PDF-planilha.
alter table public.livros
  add column if not exists data_aquisicao date,
  add column if not exists volume text not null default '',
  add column if not exists serie text not null default '',
  add column if not exists escola text not null default '';

create table if not exists public.acervo_conciliacoes (
  id uuid primary key default gen_random_uuid(),
  numero_cadastro text not null unique,
  titulo_pdf text,
  titulo_planilha text,
  presente_no_pdf boolean not null default false,
  presente_na_planilha boolean not null default false,
  status text not null default 'revisar'
    check (status in ('confere', 'somente_pdf', 'somente_planilha', 'duplicado', 'revisar')),
  observacoes text not null default '',
  resolvido_em timestamptz,
  resolvido_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.acervo_conciliacoes enable row level security;
revoke all on table public.acervo_conciliacoes from anon;
grant select, insert, update, delete on table public.acervo_conciliacoes to authenticated;
create policy "active users manage acervo conciliacoes"
  on public.acervo_conciliacoes for all to authenticated
  using ((select public.is_active_user()))
  with check ((select public.is_active_user()));
