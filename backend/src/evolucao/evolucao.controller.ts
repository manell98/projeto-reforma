import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EvolucaoService } from './evolucao.service';
import { CreateRegistroObraDto } from './dto/create-registro-obra.dto';
import { UpdateRegistroObraDto } from './dto/update-registro-obra.dto';
import { FilterRegistrosObraDto } from './dto/filter-registros-obra.dto';
import { MIMES_SUPORTADOS } from './midia.constants';

@ApiTags('evolucao')
@Controller('evolucao')
export class EvolucaoController {
  constructor(private readonly evolucaoService: EvolucaoService) {}

  @Get('registros')
  listar(@Query() filtros: FilterRegistrosObraDto) {
    return this.evolucaoService.listar(filtros);
  }

  @Get('registros/:id')
  obterUm(@Param('id') id: string) {
    return this.evolucaoService.obterUm(id);
  }

  // Devolvido pelo próprio Express (res.sendFile), que já implementa
  // requisições Range — necessário para o seek do player de vídeo.
  @Get('registros/:id/arquivo')
  async baixarArquivo(@Param('id') id: string, @Res() res: Response) {
    const { caminhoAbsoluto, mimeType } =
      await this.evolucaoService.localizarArquivo(id);
    res.type(mimeType);
    res.sendFile(caminhoAbsoluto);
  }

  @Post('registros')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['arquivo', 'dataCaptura', 'origemDataCaptura'],
      properties: {
        arquivo: {
          type: 'string',
          format: 'binary',
          description: `Foto ou vídeo (${MIMES_SUPORTADOS.join(', ')})`,
        },
        titulo: { type: 'string' },
        descricao: { type: 'string' },
        dataCaptura: { type: 'string', example: '2026-08-15' },
        origemDataCaptura: {
          type: 'string',
          enum: ['EXIF', 'ARQUIVO', 'MANUAL'],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('arquivo'))
  criar(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body() dto: CreateRegistroObraDto,
  ) {
    return this.evolucaoService.criar(arquivo, dto);
  }

  @Patch('registros/:id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateRegistroObraDto) {
    return this.evolucaoService.atualizar(id, dto);
  }

  @Delete('registros/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(@Param('id') id: string) {
    await this.evolucaoService.remover(id);
  }
}
