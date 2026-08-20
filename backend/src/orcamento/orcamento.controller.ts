import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrcamentoTipo } from '@prisma/client';
import { OrcamentoService } from './orcamento.service';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';

@ApiTags('orcamento')
@Controller('orcamento')
export class OrcamentoController {
  constructor(private readonly orcamentoService: OrcamentoService) {}

  @Get()
  listar() {
    return this.orcamentoService.listar();
  }

  @Put(':tipo')
  atualizar(
    @Param('tipo', new ParseEnumPipe(OrcamentoTipo)) tipo: OrcamentoTipo,
    @Body() dto: UpdateOrcamentoDto,
  ) {
    return this.orcamentoService.atualizar(tipo, dto);
  }
}
