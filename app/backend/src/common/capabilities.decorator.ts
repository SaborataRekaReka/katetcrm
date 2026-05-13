import { SetMetadata } from '@nestjs/common';

export const CAPABILITIES_KEY = 'capabilities';
export const Capabilities = (...capabilities: string[]) => SetMetadata(CAPABILITIES_KEY, capabilities);
