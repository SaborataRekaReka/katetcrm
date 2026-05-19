import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CrmWorkflowProfile = 'full' | 'sales-lite';

function normalizeWorkflowProfile(value: string | undefined): CrmWorkflowProfile {
  return value === 'sales-lite' ? 'sales-lite' : 'full';
}

@Injectable()
export class FullWorkflowGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const profile = normalizeWorkflowProfile(
      this.config.get<string>('CRM_WORKFLOW_PROFILE', 'full'),
    );

    if (profile === 'sales-lite') {
      throw new ForbiddenException('This API is available only in the full workflow profile');
    }

    return true;
  }
}