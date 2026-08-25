import { SetMetadata } from '@nestjs/common';
import type { ServiceApiScope } from './service-api-token';

export const SERVICE_API_SCOPES_KEY = 'service-api-scopes';

export const ServiceApiScopes = (...scopes: ServiceApiScope[]) =>
  SetMetadata(SERVICE_API_SCOPES_KEY, scopes);
