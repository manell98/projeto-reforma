import { Categoria } from '@prisma/client';

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  [Categoria.ELETRODOMESTICOS]: 'Eletrodomésticos',
  [Categoria.MATERIAIS]: 'Materiais',
  [Categoria.PEDREIRO]: 'Pedreiro',
  [Categoria.ELETRICISTA]: 'Eletricista',
  [Categoria.MARCENEIRO]: 'Marceneiro',
  [Categoria.MARMOREIRO]: 'Marmoreiro',
  [Categoria.SERRALHEIRO]: 'Serralheiro',
  [Categoria.VIDRACEIRO]: 'Vidraceiro',
  [Categoria.LADRILHEIRO]: 'Ladrilheiro',
  [Categoria.INSTALADOR_PORTA]: 'Instalador de porta',
  [Categoria.TIO_NEGUINHO]: 'Tio Neguinho (responsável pela obra)',
  [Categoria.ALUGUEL_MATERIAIS]: 'Aluguel de equipamentos',
  [Categoria.REMOCAO_ENTULHO]: 'Remoção de entulho',
  [Categoria.ARQUITETO]: 'Arquiteto',
  [Categoria.OUTROS]: 'Outros',
};

export const CATEGORIAS = Object.values(Categoria).map((valor) => ({
  valor,
  label: CATEGORIA_LABELS[valor],
}));
