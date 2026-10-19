import pb from '@/lib/pocketbase/client'

export type VoluntarioStatus = 'ativo' | 'inativo'
export type VoluntarioRole = 'administrador' | 'voluntario'

export interface Voluntario {
  id: string
  matricula: string
  nome: string
  status: VoluntarioStatus
  role?: VoluntarioRole
  created: string
  updated: string
}

export interface VoluntarioFormData {
  nome: string
  status?: VoluntarioStatus
  role?: VoluntarioRole
}

export const getVoluntarios = async (): Promise<Voluntario[]> => {
  const list = await pb.collection('voluntarios').getFullList<Voluntario>({ sort: 'matricula' })
  return [...list].sort((a, b) => {
    const na = parseInt(a.matricula, 10)
    const nb = parseInt(b.matricula, 10)
    const aNum = isNaN(na) ? Number.MAX_SAFE_INTEGER : na
    const bNum = isNaN(nb) ? Number.MAX_SAFE_INTEGER : nb
    return aNum - bNum
  })
}

export const getVoluntario = async (id: string): Promise<Voluntario> => {
  return await pb.collection('voluntarios').getOne<Voluntario>(id)
}

export const createVoluntario = async (data: VoluntarioFormData): Promise<Voluntario> => {
  return await pb.collection('voluntarios').create<Voluntario>({
    nome: data.nome,
    status: data.status || 'ativo',
    role: data.role || 'voluntario',
  })
}

export const updateVoluntario = async (
  id: string,
  data: Partial<VoluntarioFormData>,
): Promise<Voluntario> => {
  return await pb.collection('voluntarios').update<Voluntario>(id, data)
}

export const deleteVoluntario = async (id: string): Promise<void> => {
  await pb.collection('voluntarios').delete(id)
}

export const getActiveVoluntarios = async (): Promise<Voluntario[]> => {
  return await pb.collection('voluntarios').getFullList<Voluntario>({
    filter: 'status = "ativo"',
    sort: 'nome',
  })
}
