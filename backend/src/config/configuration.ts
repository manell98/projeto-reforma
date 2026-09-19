export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  cors: {
    // Sem CORS_ORIGIN no .env (o default), o main.ts libera localhost:4200 +
    // qualquer IP de rede privada na porta 4200 (uso do celular na mesma
    // wifi). Definir CORS_ORIGIN aqui vira um override explícito de origem
    // única, para quem já tinha algo customizado.
    origin: process.env.CORS_ORIGIN || undefined,
  },
  upload: {
    // Raiz dos arquivos enviados (fotos/vídeos da evolução da obra). Tem
    // default, por isso não entra na lista de env vars obrigatórias.
    dir: process.env.UPLOAD_DIR || './uploads',
  },
});
