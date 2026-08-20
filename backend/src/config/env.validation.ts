/**
 * Validação simples das variáveis de ambiente obrigatórias, executada na
 * inicialização da aplicação (via ConfigModule.forRoot({ validate })).
 *
 * Optamos por uma validação manual, sem dependências extras (como Joi),
 * para manter o número de pacotes instalados enxuto nesta etapa inicial.
 */
const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV_VARS.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não definidas: ${missing.join(
        ', ',
      )}. Copie o arquivo .env.example para .env e preencha os valores.`,
    );
  }

  return config;
}
