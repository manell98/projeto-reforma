import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { ExpensesModule } from './expenses/expenses.module';
import { OrcamentoModule } from './orcamento/orcamento.module';
import { ObraModule } from './obra/obra.module';
import { EvolucaoModule } from './evolucao/evolucao.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    ExpensesModule,
    OrcamentoModule,
    ObraModule,
    EvolucaoModule,
  ],
})
export class AppModule {}
