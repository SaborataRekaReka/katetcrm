import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, validateSync, Min } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  PORT = 3001;

  @IsString()
  API_PREFIX = '/api/v1';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '1d';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '30d';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = '';

  @IsString()
  @IsOptional()
  INTEGRATION_SITE_SECRET = '';

  @IsString()
  @IsOptional()
  INTEGRATION_MANGO_SECRET = '';

  @IsString()
  @IsOptional()
  INTEGRATION_TELEGRAM_SECRET = '';

  @IsString()
  @IsOptional()
  INTEGRATION_MAX_SECRET = '';

  @IsInt()
  @Min(1)
  @IsOptional()
  INTEGRATION_HMAC_TOLERANCE_SEC = 300;
}

export function validateEnv(config: Record<string, unknown>) {
  const coerced: Record<string, unknown> = { ...config };
  if (typeof coerced.PORT === 'string') coerced.PORT = Number.parseInt(coerced.PORT, 10);
  if (typeof coerced.INTEGRATION_HMAC_TOLERANCE_SEC === 'string') {
    coerced.INTEGRATION_HMAC_TOLERANCE_SEC = Number.parseInt(
      coerced.INTEGRATION_HMAC_TOLERANCE_SEC,
      10,
    );
  }

  const validated = plainToInstance(EnvVars, coerced, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const message = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return validated;
}
