import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Expense, FormaPagamento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';

export type SerializedExpense = Omit<Expense, 'valor'> & { valor: number };

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto): Promise<SerializedExpense> {
    const { formaPagamento, parcelas } = this.normalizarFormaPagamento(
      dto.formaPagamento,
      dto.parcelas,
    );

    const expense = await this.prisma.expense.create({
      data: {
        valor: dto.valor,
        descricao: dto.descricao,
        categoria: dto.categoria,
        data: new Date(dto.data),
        observacao: dto.observacao,
        formaPagamento,
        parcelas,
      },
    });
    return this.serialize(expense);
  }

  async findAll(filters: FilterExpensesDto): Promise<SerializedExpense[]> {
    const where: Prisma.ExpenseWhereInput = {};

    if (filters.categoria) {
      where.categoria = filters.categoria;
    }

    if (filters.descricao) {
      where.descricao = { contains: filters.descricao, mode: 'insensitive' };
    }

    if (filters.dataInicio || filters.dataFim) {
      where.data = {
        ...(filters.dataInicio ? { gte: new Date(filters.dataInicio) } : {}),
        ...(filters.dataFim ? { lte: new Date(filters.dataFim) } : {}),
      };
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { data: 'desc' },
    });

    return expenses.map((expense) => this.serialize(expense));
  }

  async findOne(id: string): Promise<SerializedExpense> {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException(`Despesa ${id} não encontrada`);
    }
    return this.serialize(expense);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<SerializedExpense> {
    const existente = await this.findOne(id);

    const alteraFormaPagamento =
      dto.formaPagamento !== undefined || dto.parcelas !== undefined;
    const formaPagamentoNormalizada = alteraFormaPagamento
      ? this.normalizarFormaPagamento(
          dto.formaPagamento !== undefined
            ? dto.formaPagamento
            : existente.formaPagamento,
          dto.parcelas !== undefined ? dto.parcelas : existente.parcelas,
        )
      : null;

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
        ...(dto.data !== undefined ? { data: new Date(dto.data) } : {}),
        ...(dto.observacao !== undefined ? { observacao: dto.observacao } : {}),
        ...(formaPagamentoNormalizada ?? {}),
      },
    });

    return this.serialize(expense);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.expense.delete({ where: { id } });
  }

  // Cartão de crédito sempre exige parcelas (1 a 12); Pix nunca carrega
  // parcelas — qualquer valor recebido junto de PIX é ignorado, em vez de
  // rejeitado, para não travar o formulário numa combinação transitória.
  private normalizarFormaPagamento(
    formaPagamento: FormaPagamento | null,
    parcelas: number | null | undefined,
  ): { formaPagamento: FormaPagamento | null; parcelas: number | null } {
    if (formaPagamento === FormaPagamento.CARTAO_CREDITO) {
      if (parcelas === undefined || parcelas === null) {
        throw new BadRequestException(
          'Informe a quantidade de parcelas para pagamento no cartão de crédito.',
        );
      }
      return { formaPagamento, parcelas };
    }
    return { formaPagamento: formaPagamento ?? null, parcelas: null };
  }

  private serialize(expense: Expense): SerializedExpense {
    return { ...expense, valor: Number(expense.valor) };
  }
}
