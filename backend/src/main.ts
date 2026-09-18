import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Sem `CORS_ORIGIN` configurada, o app roda sem autenticação numa rede
 * doméstica: o objetivo é liberar o acesso de outros dispositivos da mesma
 * wifi (ex: celular abrindo `http://192.168.x.x:4200`) sem abrir a origem
 * para a internet pública. Por isso aceitamos `localhost:4200` (uso normal
 * no PC) e qualquer IP das três faixas de rede privada da RFC 1918
 * (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`) na porta 4200 — nunca um
 * hostname/domínio arbitrário.
 */
function origemDeRedeLocalPermitida(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.port !== '4200') {
    return false;
  }
  if (url.hostname === 'localhost') {
    return true;
  }

  const octetos = url.hostname.split('.').map(Number);
  if (octetos.length !== 4 || octetos.some((octeto) => Number.isNaN(octeto))) {
    return false;
  }
  const [a, b] = octetos;
  if (a === 192 && b === 168) return true;
  if (a === 10) return true;
  return a === 172 && b >= 16 && b <= 31;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOriginConfigurada = configService.get<string>('cors.origin');

  app.enableCors({
    origin: corsOriginConfigurada
      ? corsOriginConfigurada
      : (
          origin: string | undefined,
          callback: (erro: Error | null, permitir?: boolean) => void,
        ) => {
          // Sem cabeçalho Origin (ex: curl, Swagger local, apps nativos) ou
          // origem dentro da LAN: libera. Qualquer outra coisa é rejeitada.
          if (!origin || origemDeRedeLocalPermitida(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Origem não permitida pelo CORS'), false);
          }
        },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Reforma API')
    .setDescription('API para controle e análise dos gastos da reforma')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Aplicação rodando em http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Documentação Swagger em http://localhost:${port}/docs`);
}

bootstrap();
