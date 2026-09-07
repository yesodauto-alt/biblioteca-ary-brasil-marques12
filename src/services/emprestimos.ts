import pb from '@/lib/pocketbase/client'
import { getLivroByCadastro } from '@/services/livros'
import { getVoluntario } from '@/services/voluntarios'

export interface Emprestimo {
  id: string
  leitor: string
  livro: string
  data_emprestimo: string
  data_prevista_devolucao: string
  data_devolucao_real: string
  status: 'ativo' | 'devolvido' | 'atrasado'
  quantidade_renovacoes: number
  responsavel?: string
  responsavel_voluntario?: string
  tipo_emprestimo: 'comum' | 'estudo'
  created: string
  updated: string
  expand?: {
    livro?: { id: string; titulo: string; autor: string; numero_cadastro: string }
    responsavel?: { id: string; nome: string; matricula: string }
    responsavel_voluntario?: { id: string; nome: string; matricula: string }
  }
}

export interface EmprestimoWithLeitor extends Emprestimo {
  expand?: {
    livro?: { id: string; titulo: string; autor: string; numero_cadastro: string }
    leitor?: { id: string; nome_completo: string; numero_cadastro: string }
    responsavel?: { id: string; nome: string; matricula: string }
    responsavel_voluntario?: { id: string; nome: string; matricula: string }
  }
}

export const getEmprestimosByLeitor = async (leitorId: string): Promise<Emprestimo[]> => {
  return await pb.collection('emprestimos').getFullList<Emprestimo>({
    filter: `leitor = "${leitorId}"`,
    sort: '-data_emprestimo',
    expand: 'livro',
  })
}

export const getEmprestimosByLivro = async (livroId: string): Promise<EmprestimoWithLeitor[]> => {
  return await pb.collection('emprestimos').getFullList<EmprestimoWithLeitor>({
    filter: `livro = "${livroId}"`,
    sort: '-data_emprestimo',
    expand: 'leitor,livro',
  })
}

export interface CreateEmprestimoData {
  leitor: string
  livro: string
  responsavel_voluntario: string
  tipo_emprestimo?: 'comum' | 'estudo'
}

export const createEmprestimo = async (data: CreateEmprestimoData): Promise<Emprestimo> => {
  const tipo = data.tipo_emprestimo || 'comum'

  return await pb.collection('emprestimos').create<Emprestimo>({
    leitor: data.leitor,
    livro: data.livro,
    status: 'ativo',
    quantidade_renovacoes: 0,
    responsavel_voluntario: data.responsavel_voluntario,
    tipo_emprestimo: tipo,
  })
}

export const getActiveEmprestimos = async (): Promise<EmprestimoWithLeitor[]> => {
  return await pb.collection('emprestimos').getFullList<EmprestimoWithLeitor>({
    filter: `status = "ativo" || status = "atrasado"`,
    sort: 'data_prevista_devolucao',
    expand: 'leitor,livro',
  })
}

export const getEmprestimo = async (id: string): Promise<EmprestimoWithLeitor> => {
  try {
    return await pb.collection('emprestimos').getOne<EmprestimoWithLeitor>(id, {
      expand: 'leitor,livro,responsavel_voluntario',
    })
  } catch {
    // Fallback: try fetching without expand
    const emprestimo = await pb.collection('emprestimos').getOne<EmprestimoWithLeitor>(id)

    const expand: EmprestimoWithLeitor['expand'] = { ...emprestimo.expand }

    if (emprestimo.leitor) {
      try {
        const leitor = await pb.collection('leitores').getOne(emprestimo.leitor)
        expand.leitor = {
          id: leitor.id,
          nome_completo: leitor.nome_completo,
          numero_cadastro: leitor.numero_cadastro,
        }
      } catch {
        /* leitor record deleted — leave expand.leitor undefined */
      }
    }

    if (emprestimo.livro) {
      try {
        const livro = await pb.collection('livros').getOne(emprestimo.livro)
        expand.livro = {
          id: livro.id,
          titulo: livro.titulo,
          autor: livro.autor,
          numero_cadastro: livro.numero_cadastro,
        }
      } catch {
        /* livro record deleted — leave expand.livro undefined */
      }
    }

    if (emprestimo.responsavel_voluntario) {
      try {
        const vol = await getVoluntario(emprestimo.responsavel_voluntario)
        expand.responsavel_voluntario = {
          id: vol.id,
          nome: vol.nome,
          matricula: vol.matricula,
        }
      } catch {
        /* volunteer record deleted — leave expand.responsavel_voluntario undefined */
      }
    }

    emprestimo.expand = expand
    return emprestimo
  }
}

export const getActiveEmprestimoByLivroCadastro = async (
  numeroCadastro: string,
): Promise<EmprestimoWithLeitor> => {
  const livro = await getLivroByCadastro(numeroCadastro)
  return await pb
    .collection('emprestimos')
    .getFirstListItem<EmprestimoWithLeitor>(
      `livro = "${livro.id}" && (status = "ativo" || status = "atrasado")`,
      { expand: 'leitor,livro', sort: '-data_emprestimo' },
    )
}

export const searchActiveEmprestimos = async (
  query: string,
): Promise<EmprestimoWithLeitor[]> => {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []

  const emprestimos = await getActiveEmprestimos()
  return emprestimos
    .filter((emprestimo) => {
      const livro = emprestimo.expand?.livro
      const leitor = emprestimo.expand?.leitor
      return [
        livro?.numero_cadastro,
        livro?.titulo,
        livro?.autor,
        leitor?.numero_cadastro,
        leitor?.nome_completo,
      ].some((value) => value?.toLocaleLowerCase().includes(normalized))
    })
    .sort((a, b) => {
      const aExact = a.expand?.livro?.numero_cadastro === query.trim() ? 0 : 1
      const bExact = b.expand?.livro?.numero_cadastro === query.trim() ? 0 : 1
      return aExact - bExact
    })
}

export const getDevolucoesHoje = async (): Promise<EmprestimoWithLeitor[]> => {
  const today = new Date().toISOString().split('T')[0]
  return await pb.collection('emprestimos').getFullList<EmprestimoWithLeitor>({
    filter: `status = "devolvido" && data_devolucao_real = "${today}"`,
    sort: '-updated',
    expand: 'leitor,livro',
  })
}

export const devolverEmprestimo = async (id: string, voluntarioId: string): Promise<Emprestimo> => {
  return await pb.send(`/backend/v1/emprestimos/${id}/devolver`, {
    method: 'POST',
    body: JSON.stringify({ voluntario_id: voluntarioId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const renovarEmprestimo = async (
  id: string,
  novaData: string,
  voluntarioId: string,
): Promise<Emprestimo> => {
  return await pb.send(`/backend/v1/emprestimos/${id}/renovar`, {
    method: 'POST',
    body: JSON.stringify({ voluntario_id: voluntarioId, nova_data_devolucao: novaData }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const excluirEmprestimo = async (id: string, voluntarioId?: string): Promise<void> => {
  await pb.send(`/backend/v1/emprestimos/${id}/excluir`, {
    method: 'POST',
    body: JSON.stringify(voluntarioId ? { voluntario_id: voluntarioId } : {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

export interface EditarEmprestimoData {
  leitor: string
  livro: string
  tipo_emprestimo: 'comum' | 'estudo'
  voluntario_id: string
}

export const editarEmprestimo = async (
  id: string,
  data: EditarEmprestimoData,
): Promise<Emprestimo> => {
  return await pb.send(`/backend/v1/emprestimos/${id}/editar`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const hasActiveLoansByLeitor = async (leitorId: string): Promise<boolean> => {
  try {
    await pb
      .collection('emprestimos')
      .getFirstListItem(`leitor = "${leitorId}" && (status = "ativo" || status = "atrasado")`)
    return true
  } catch {
    return false
  }
}

export const hasActiveLoansByLivro = async (livroId: string): Promise<boolean> => {
  try {
    await pb
      .collection('emprestimos')
      .getFirstListItem(`livro = "${livroId}" && (status = "ativo" || status = "atrasado")`)
    return true
  } catch {
    return false
  }
}

export const hasActiveLoansByResponsavel = async (voluntarioId: string): Promise<boolean> => {
  try {
    await pb
      .collection('emprestimos')
      .getFirstListItem(
        `responsavel_voluntario = "${voluntarioId}" && (status = "ativo" || status = "atrasado")`,
      )
    return true
  } catch {
    return false
  }
}
