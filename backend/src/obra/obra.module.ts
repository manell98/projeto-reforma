import { Module } from '@nestjs/common';
import { ObraController } from './obra.controller';
import { ObraService } from './obra.service';

@Module({
  controllers: [ObraController],
  providers: [ObraService],
})
export class ObraModule {}
