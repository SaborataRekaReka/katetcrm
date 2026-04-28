import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateWorkspaceSectionDto, WorkspaceSettingRowDto } from './settings.dto';

export interface WorkspaceSettingSection {
  id: string;
  title: string;
  description: string;
  rows: WorkspaceSettingRowDto[];
}

export interface WorkspaceSettingsState {
  sections: WorkspaceSettingSection[];
}

const WORKSPACE_SETTINGS_KEY = 'admin.workspace_settings.v1';

const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsState = {
  sections: [
    {
      id: 'general',
      title: 'Общие',
      description: 'Базовые параметры CRM',
      rows: [
        { label: 'Название пространства', value: 'Katet CRM' },
        { label: 'Часовой пояс', value: 'Europe/Moscow' },
        { label: 'Язык интерфейса', value: 'Русский' },
      ],
    },
    {
      id: 'stages',
      title: 'Этапы воронки',
      description: 'Условия перехода между стадиями',
      rows: [
        { label: 'lead → application', value: 'Требуются: контакт, тип техники' },
        { label: 'application → reservation', value: 'Требуется: подтверждённая позиция' },
        { label: 'reservation → departure', value: 'Требуется: назначенная единица' },
        { label: 'departure → completed', value: 'Требуется: акт выполнения' },
      ],
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      description: 'Каналы и события',
      rows: [
        { label: 'Срочный лид', value: 'Email + в интерфейсе' },
        { label: 'Конфликт брони', value: 'В интерфейсе' },
        { label: 'Просроченный выезд', value: 'Email + SMS ответственному' },
      ],
    },
  ],
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async getWorkspaceSettings() {
    return this.readWorkspaceSettings();
  }

  async updateWorkspaceSection(
    sectionId: string,
    dto: UpdateWorkspaceSectionDto,
    actorId?: string,
  ) {
    const state = await this.readWorkspaceSettings();
    const section = state.sections.find((s) => s.id === sectionId);
    if (!section) {
      throw new NotFoundException('Секция настроек не найдена.');
    }

    const previous = {
      title: section.title,
      description: section.description,
      rows: cloneJson(section.rows),
    };

    if (dto.title !== undefined) {
      section.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      section.description = dto.description.trim();
    }
    if (dto.rows !== undefined) {
      section.rows = dto.rows.map((r) => ({
        label: r.label.trim(),
        value: r.value.trim(),
      }));
    }

    await this.persistWorkspaceSettings(state);

    await this.activity.log({
      action: 'updated',
      entityType: 'settings',
      entityId: sectionId,
      actorId,
      summary: `Обновлены настройки секции ${section.title}`,
      payload: {
        before: previous,
        after: {
          title: section.title,
          description: section.description,
          rows: section.rows,
        },
      } as unknown as Prisma.InputJsonValue,
    });

    return section;
  }

  private async readWorkspaceSettings(): Promise<WorkspaceSettingsState> {
    const fallback = cloneJson(DEFAULT_WORKSPACE_SETTINGS);
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: WORKSPACE_SETTINGS_KEY },
      select: { payload: true },
    });

    if (!existing) {
      await this.prisma.systemConfig.create({
        data: {
          key: WORKSPACE_SETTINGS_KEY,
          payload: fallback as unknown as Prisma.InputJsonValue,
        },
      });
      return fallback;
    }

    const payload = existing.payload as WorkspaceSettingsState | null;
    if (!payload || !Array.isArray(payload.sections)) {
      return fallback;
    }

    return cloneJson(payload);
  }

  private async persistWorkspaceSettings(state: WorkspaceSettingsState) {
    await this.prisma.systemConfig.upsert({
      where: { key: WORKSPACE_SETTINGS_KEY },
      create: {
        key: WORKSPACE_SETTINGS_KEY,
        payload: state as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: state as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
