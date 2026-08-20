import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global: qualquer módulo de feature (expenses, categories, etc.)
 * pode injetar o PrismaService sem precisar importar este módulo explicitamente.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
