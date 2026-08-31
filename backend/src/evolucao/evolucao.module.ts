import { BadRequestException, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { EvolucaoController } from './evolucao.controller';
import { EvolucaoService } from './evolucao.service';
import {
  MIDIAS_SUPORTADAS,
  TAMANHO_MAXIMO_VIDEO_BYTES,
  resolverDiretorioEvolucao,
} from './midia.constants';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const diretorio = resolverDiretorioEvolucao(
          configService.get<string>('upload.dir') ?? './uploads',
        );

        return {
          storage: diskStorage({
            destination: (_req, _file, cb) => {
              fs.mkdirSync(diretorio, { recursive: true });
              cb(null, diretorio);
            },
            // Nome sempre gerado pelo servidor (uuid + extensão do mime): o
            // nome enviado pelo usuário nunca chega ao sistema de arquivos,
            // ele vai só como metadado (`arquivoNome`) no banco.
            filename: (_req, file, cb) =>
              cb(
                null,
                `${randomUUID()}${MIDIAS_SUPORTADAS[file.mimetype].extensao}`,
              ),
          }),
          // Teto absoluto (o maior entre foto e vídeo); o limite específico de
          // cada tipo é conferido no service, que remove o arquivo se estourar.
          limits: { fileSize: TAMANHO_MAXIMO_VIDEO_BYTES },
          fileFilter: (_req, file, cb) => {
            if (MIDIAS_SUPORTADAS[file.mimetype]) {
              cb(null, true);
              return;
            }
            cb(
              new BadRequestException(
                `Tipo de arquivo não suportado (${file.mimetype}). Envie uma foto (JPEG, PNG, WebP ou HEIC) ou um vídeo (MP4, MOV ou WebM).`,
              ),
              false,
            );
          },
        };
      },
    }),
  ],
  controllers: [EvolucaoController],
  providers: [EvolucaoService],
})
export class EvolucaoModule {}
