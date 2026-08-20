import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ObraService } from './obra.service';
import { UpdateObraDto } from './dto/update-obra.dto';

@ApiTags('obra')
@Controller('obra')
export class ObraController {
  constructor(private readonly obraService: ObraService) {}

  @Get()
  obter() {
    return this.obraService.obter();
  }

  @Put()
  atualizar(@Body() dto: UpdateObraDto) {
    return this.obraService.atualizar(dto);
  }
}
