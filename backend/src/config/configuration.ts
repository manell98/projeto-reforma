export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },
  upload: {
    // Raiz dos arquivos enviados (fotos/vídeos da evolução da obra). Tem
    // default, por isso não entra na lista de env vars obrigatórias.
    dir: process.env.UPLOAD_DIR || './uploads',
  },
});
