create unique index if not exists emprestimos_one_active_book
on public.emprestimos (livro_id)
where status in ('ativo', 'atrasado');

create or replace function public.criar_emprestimo(
  p_leitor_id uuid,
  p_livro_id uuid,
  p_voluntario_id uuid,
  p_tipo public.tipo_emprestimo default 'comum'
)
returns public.emprestimos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.configuracoes;
  v_count integer;
  v_emprestimo public.emprestimos;
begin
  if not public.is_active_user() then
    raise exception 'Usuário sem permissão';
  end if;

  select * into v_cfg from public.configuracoes limit 1;

  perform 1
  from public.leitores
  where id = p_leitor_id and status = 'ativo'
  for share;
  if not found then
    raise exception 'Leitor inválido ou inativo';
  end if;

  perform 1
  from public.livros
  where id = p_livro_id and status = 'disponível'
  for update;
  if not found then
    raise exception 'Livro indisponível';
  end if;

  select count(*) into v_count
  from public.emprestimos
  where leitor_id = p_leitor_id
    and status in ('ativo', 'atrasado')
    and tipo_emprestimo = p_tipo;

  if (p_tipo = 'comum' and v_count >= v_cfg.limite_livros_por_usuario)
     or (p_tipo = 'estudo' and v_count >= 1) then
    raise exception 'Limite de empréstimos atingido';
  end if;

  insert into public.emprestimos (
    leitor_id,
    livro_id,
    data_prevista_devolucao,
    responsavel_voluntario_id,
    tipo_emprestimo
  )
  values (
    p_leitor_id,
    p_livro_id,
    current_date + case when p_tipo = 'estudo' then 90 else v_cfg.prazo_devolucao_dias end,
    p_voluntario_id,
    p_tipo
  )
  returning * into v_emprestimo;

  update public.livros
  set status = 'emprestado'
  where id = p_livro_id;

  insert into public.auditoria(usuario_id, acao, registro_id, detalhes)
  values (
    auth.uid(),
    'emprestimo',
    v_emprestimo.id,
    jsonb_build_object('livro_id', p_livro_id, 'leitor_id', p_leitor_id)
  );

  return v_emprestimo;
end;
$$;
