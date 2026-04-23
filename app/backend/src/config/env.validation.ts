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
}

export function validateEnv(config: Record<string, unknown>) {
  const coerced: Record<string, unknown> = { ...config };
  if (typeof coerced.PORT === 'string') coerced.PORT = Number.parseInt(coerced.PORT, 10);

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
