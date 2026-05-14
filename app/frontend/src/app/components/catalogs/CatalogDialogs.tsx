/**
 * Shell-modal справочников.
 *
 * Единый «shell» для всех атомов/молекул справочника (категория, тип,
 * единица техники, подрядчик). Один и тот же EntityModalFramework, что и у
 * LeadDetailModal / ReservationWorkspace — но со своей начинкой.
 *
 * Контракт публичных пропсов (CategoryDialog/TypeDialog/UnitDialog/
 * SubcontractorDialog) намеренно сохранён совместимым с предыдущим компактным
 * диалогом — чтобы CatalogsWorkspacePage не пришлось переписывать.
 *
 * Режим:
 *   entity == null|undefined → create (все поля пустые, Save disabled пока
 *                                       не заполнены обязательные)
 *   entity != null           → edit   (Save disabled пока ничего не изменено
 *                                       или required сломаны)
 *
 * Валидация: required-поля подсвечиваются красной рамкой, если пользователь
 * попытался сохранить или поле было тронуто и очищено.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Building2,
  ChevronsUpDown,
  FileText,
  FolderTree,
  Info,
  Layers,
  MapPin,
  Package,
  Phone,
  Tag,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  EntityMetaGrid,
  EntityModalHeader,
  EntityModalShell,
  EntitySection,
} from '../detail/EntityModalFramework';
import { PropertyRow } from '../detail/DetailShell';
import {
  FieldInput,
  FieldSelect,
  FieldTextarea,
  ShellDialog,
} from '../detail/ShellFormPrimitives';
import { useLayout } from '../shell/layoutStore';
import {
  useCreateEquipmentCategory,
  useCreateEquipmentType,
  useCreateEquipmentUnit,
  useCreateSubcontractor,
  useDeleteEquipmentCategory,
  useDeleteEquipmentType,
  useDeleteEquipmentUnit,
  useDeleteSubcontractor,
  useUpdateEquipmentCategory,
  useUpdateEquipmentType,
  useUpdateEquipmentUnit,
  useUpdateSubcontractor,
} from '../../hooks/useDirectoriesMutations';
import {
  useEquipmentCategoriesQuery,
  useEquipmentTypesQuery,
} from '../../hooks/useDirectoriesQuery';
import { cn } from '../../lib/utils';
import type {
  EquipmentCategoryApi,
  EquipmentTypeApi,
  EquipmentUnitApi,
  SubcontractorApi,
} from '../../lib/directoriesApi';

type DirectoryStatus = 'active' | 'inactive' | 'archived';

const STATUS_LABEL: Record<DirectoryStatus, string> = {
  active: 'Активно',
  inactive: 'Неактивно',
  archived: 'Архив',
};

/* ========================================================================== *
 *                                 Category                                   *
 * ========================================================================== */

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: EquipmentCategoryApi | null;
};

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { role } = useLayout();
  const canDelete = role === 'admin';
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateEquipmentCategory();
  const updateMut = useUpdateEquipmentCategory();
  const deleteMut = useDeleteEquipmentCategory();
  const isEdit = !!category;
  const mut = isEdit ? updateMut : createMut;

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    deleteMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2;
  const dirty = isEdit ? trimmed !== (category?.name ?? '').trim() : trimmed.length > 0;
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    try {
      if (isEdit && category) {
        await updateMut.mutateAsync({ id: category.id, body: { name: trimmed } });
      } else {
        await createMut.mutateAsync({ name: trimmed });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const remove = async () => {
    if (!isEdit || !category) return;
    const confirmed = globalThis.confirm(`Удалить категорию «${category.name}»?`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteMut.mutateAsync({ id: category.id });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить категорию');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<FolderTree className="h-3 w-3 text-gray-500" />}
          entityLabel="Категория техники"
          title={isEdit ? category!.name : 'Новая категория'}
          subtitle={
            isEdit
              ? `ID ${category!.id.slice(0, 8)}`
              : 'Заполните обязательные поля и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            onClick: submit,
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <div className="rounded border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] text-blue-900">
            Единицы техники в этом разделе — это собственный парк. Партнерская техника ведется через справочник подрядчиков.
          </div>

          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      setTouched(true);
                    }}
                    placeholder="Землеройная"
                    invalid={touched && !nameValid}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          {isEdit && canDelete ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  void remove();
                }}
                disabled={deleteMut.isPending || mut.isPending}
              >
                {deleteMut.isPending ? 'Удаляем…' : 'Удалить категорию'}
              </Button>
            </div>
          ) : null}
        </div>
      </EntityModalShell>
    </ShellDialog>
  );
}

/* ========================================================================== *
 *                               Equipment type                               *
 * ========================================================================== */

type TypeDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type?: EquipmentTypeApi | null;
};

export function TypeDialog({ open, onOpenChange, type }: TypeDialogProps) {
  const { role } = useLayout();
  const canDelete = role === 'admin';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateEquipmentType();
  const updateMut = useUpdateEquipmentType();
  const deleteMut = useDeleteEquipmentType();
  const isEdit = !!type;
  const mut = isEdit ? updateMut : createMut;
  const categoriesQuery = useEquipmentCategoriesQuery(open);

  useEffect(() => {
    if (!open) return;
    setName(type?.name ?? '');
    setDescription(type?.description ?? '');
    setCategoryId(type?.categoryId ?? '');
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    deleteMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type?.id]);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2;
  const dirty = isEdit
    ? trimmed !== (type?.name ?? '').trim()
      || description.trim() !== (type?.description ?? '').trim()
      || categoryId !== (type?.categoryId ?? '')
    : trimmed.length > 0 || description.trim().length > 0 || !!categoryId;
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    const body: Record<string, unknown> = { name: trimmed };
    if (description.trim()) body.description = description.trim();
    if (categoryId) body.categoryId = categoryId;
    try {
      if (isEdit && type) {
        await updateMut.mutateAsync({ id: type.id, body });
      } else {
        await createMut.mutateAsync(body);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const remove = async () => {
    if (!isEdit || !type) return;
    const confirmed = globalThis.confirm(`Удалить тип техники «${type.name}»?`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteMut.mutateAsync({ id: type.id });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить тип техники');
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: '__none__', label: 'Без категории' },
      ...(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categoriesQuery.data],
  );

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Layers className="h-3 w-3 text-gray-500" />}
          entityLabel="Тип техники"
          title={isEdit ? type!.name : 'Новый тип техники'}
          subtitle={
            isEdit
              ? `ID ${type!.id.slice(0, 8)} · Единиц: ${type!._count?.units ?? 0}`
              : 'Заполните обязательные поля и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      setTouched(true);
                    }}
                    placeholder="Экскаватор"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<FolderTree className="h-3 w-3" />}
                label="Категория"
                value={
                  <FieldSelect
                    value={categoryId || '__none__'}
                    onChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
                    options={categoryOptions}
                    placeholder="Без категории"
                    disabled={categoriesQuery.isLoading}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Описание">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={description}
                  onChange={setDescription}
                  placeholder="Гусеничный / колёсный, грузоподъёмность…"
                />
              }
            />
          </EntitySection>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          {isEdit && canDelete ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  void remove();
                }}
                disabled={deleteMut.isPending || mut.isPending}
              >
                {deleteMut.isPending ? 'Удаляем…' : 'Удалить тип'}
              </Button>
            </div>
          ) : null}
        </div>
      </EntityModalShell>
    </ShellDialog>
  );
}

/* ========================================================================== *
 *                               Equipment unit                               *
 * ========================================================================== */

type UnitDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit?: EquipmentUnitApi | null;
  initialValues?: { name?: string; equipmentTypeId?: string; notes?: string };
  onCreated?: (unit: EquipmentUnitApi) => void;
};

type UnitForm = {
  name: string;
  equipmentTypeId: string;
  year: string;
  plateNumber: string;
  notes: string;
  status: DirectoryStatus;
};

const EMPTY_UNIT: UnitForm = {
  name: '',
  equipmentTypeId: '',
  year: '',
  plateNumber: '',
  notes: '',
  status: 'active',
};

export function UnitDialog({ open, onOpenChange, unit, initialValues, onCreated }: UnitDialogProps) {
  const { role } = useLayout();
  const canDelete = role === 'admin';
  const [form, setForm] = useState<UnitForm>(EMPTY_UNIT);
  const [typeQuery, setTypeQuery] = useState('');
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeCreateError, setTypeCreateError] = useState<string | null>(null);
  const createTypeMut = useCreateEquipmentType();
  const createMut = useCreateEquipmentUnit();
  const updateMut = useUpdateEquipmentUnit();
  const deleteMut = useDeleteEquipmentUnit();
  const isEdit = !!unit;
  const mut = isEdit ? updateMut : createMut;
  const typesQuery = useEquipmentTypesQuery(undefined, open);

  useEffect(() => {
    if (!open) return;
    if (unit) {
      setForm({
        name: unit.name,
        equipmentTypeId: unit.equipmentTypeId,
        year: unit.year ? String(unit.year) : '',
        plateNumber: unit.plateNumber ?? '',
        notes: unit.notes ?? '',
        status: unit.status,
      });
    } else {
      setForm({ ...EMPTY_UNIT, ...initialValues });
    }
    setTypeQuery(unit?.equipmentType?.name ?? '');
    setIsTypeMenuOpen(false);
    setTouched(false);
    setError(null);
    setTypeCreateError(null);
    createTypeMut.reset();
    createMut.reset();
    updateMut.reset();
    deleteMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id, initialValues?.name, initialValues?.equipmentTypeId, initialValues?.notes]);

  useEffect(() => {
    if (!open) return;
    if (!form.equipmentTypeId) return;
    const selectedType = (typesQuery.data ?? []).find((t) => t.id === form.equipmentTypeId);
    if (!selectedType) return;
    const normalizedCurrent = typeQuery.trim().toLowerCase();
    const normalizedSelected = selectedType.name.trim().toLowerCase();
    if (!normalizedCurrent || normalizedCurrent === normalizedSelected) {
      setTypeQuery(selectedType.name);
    }
  }, [open, form.equipmentTypeId, typeQuery, typesQuery.data]);

  const set = <K extends keyof UnitForm>(k: K, v: UnitForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const normalizedTypeQuery = typeQuery.trim().toLowerCase();
  const matchingTypes = useMemo(() => {
    const rows = typesQuery.data ?? [];
    if (!normalizedTypeQuery) return rows;
    return rows.filter((type) =>
      type.name.toLowerCase().includes(normalizedTypeQuery),
    );
  }, [normalizedTypeQuery, typesQuery.data]);
  const visibleTypeOptions = useMemo(
    () => matchingTypes.slice(0, 8),
    [matchingTypes],
  );
  const canCreateTypeOnSubmit =
    normalizedTypeQuery.length >= 2 && matchingTypes.length === 0;

  const nameValid = form.name.trim().length >= 1;
  const typeValid = form.equipmentTypeId.length > 0 || canCreateTypeOnSubmit;

  const dirty = isEdit && unit
    ? form.name.trim() !== unit.name.trim()
      || form.equipmentTypeId !== unit.equipmentTypeId
      || form.year !== (unit.year ? String(unit.year) : '')
      || form.plateNumber !== (unit.plateNumber ?? '')
      || form.notes !== (unit.notes ?? '')
      || form.status !== unit.status
    : nameValid || typeQuery.trim().length > 0 || form.year !== '' || form.plateNumber !== ''
      || form.notes !== '' || form.status !== 'active';
  const canSave =
    nameValid
    && typeValid
    && dirty
    && !mut.isPending
    && !createTypeMut.isPending;

  const handleTypeQueryChange = (value: string) => {
    setTypeQuery(value);
    setTypeCreateError(null);
    setTouched(true);
    setIsTypeMenuOpen(true);

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      set('equipmentTypeId', '');
      return;
    }

    const exactMatch = (typesQuery.data ?? []).find(
      (type) => type.name.trim().toLowerCase() === normalized,
    );
    set('equipmentTypeId', exactMatch?.id ?? '');
  };

  const selectTypeOption = (type: EquipmentTypeApi) => {
    set('equipmentTypeId', type.id);
    setTypeQuery(type.name);
    setTouched(true);
    setTypeCreateError(null);
    setIsTypeMenuOpen(false);
  };

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    setTypeCreateError(null);

    let equipmentTypeId = form.equipmentTypeId;
    const typedTypeName = typeQuery.trim();

    if (!equipmentTypeId) {
      const exactMatch = (typesQuery.data ?? []).find(
        (type) => type.name.trim().toLowerCase() === typedTypeName.toLowerCase(),
      );

      if (exactMatch) {
        equipmentTypeId = exactMatch.id;
      } else if (typedTypeName.length >= 2 && matchingTypes.length === 0) {
        try {
          const createdType = await createTypeMut.mutateAsync({ name: typedTypeName });
          equipmentTypeId = createdType.id;
          set('equipmentTypeId', createdType.id);
          setTypeQuery(createdType.name);
          await typesQuery.refetch();
        } catch (err) {
          setTypeCreateError(err instanceof Error ? err.message : 'Не удалось создать тип техники');
          return;
        }
      } else {
        setTypeCreateError('Выберите тип из подсказок или уточните название.');
        return;
      }
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      equipmentTypeId,
      status: form.status,
    };
    if (form.year && Number.isFinite(Number(form.year))) body.year = Number(form.year);
    if (form.plateNumber.trim()) body.plateNumber = form.plateNumber.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    try {
      if (isEdit && unit) {
        await updateMut.mutateAsync({ id: unit.id, body });
      } else {
        const created = await createMut.mutateAsync(body);
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const toggleArchive = async () => {
    if (!isEdit || !unit) return;

    const nextStatus: DirectoryStatus = form.status === 'archived' ? 'active' : 'archived';
    setError(null);
    try {
      await updateMut.mutateAsync({ id: unit.id, body: { status: nextStatus } });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус единицы');
    }
  };

  const remove = async () => {
    if (!isEdit || !unit) return;
    const confirmed = globalThis.confirm(`Удалить единицу техники «${unit.name}»?`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteMut.mutateAsync({ id: unit.id });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить единицу техники');
    }
  };

  const currentType = typesQuery.data?.find((t) => t.id === form.equipmentTypeId);
  const categoryLabel =
    currentType?.category?.name ?? unit?.equipmentType?.category?.name ?? '—';

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Package className="h-3 w-3 text-gray-500" />}
          entityLabel="Единица техники"
          title={isEdit ? unit!.name : 'Новая единица техники'}
          subtitle={
            isEdit
              ? `${unit!.equipmentType?.name ?? '—'}${
                  unit!.equipmentType?.category?.name
                    ? ' · ' + unit!.equipmentType.category.name
                    : ''
                } · ${STATUS_LABEL[unit!.status]}`
              : 'Заполните название, тип техники и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
                      setTouched(true);
                    }}
                    placeholder="CAT 320D"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<Layers className="h-3 w-3" />}
                label="Тип техники *"
                value={
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        value={typeQuery}
                        onChange={(event) => {
                          handleTypeQueryChange(event.target.value);
                        }}
                        onFocus={() => {
                          setIsTypeMenuOpen(true);
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setIsTypeMenuOpen(false);
                          }, 120);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && visibleTypeOptions.length > 0) {
                            event.preventDefault();
                            selectTypeOption(visibleTypeOptions[0]);
                          }
                        }}
                        placeholder="Начните вводить тип техники"
                        disabled={createTypeMut.isPending}
                        className={cn(
                          'w-full h-6 min-h-6 rounded px-1.5 pr-7 text-[11px] leading-5 bg-transparent outline-none transition-colors border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white',
                          touched && !typeValid && 'border-rose-300 bg-rose-50/40',
                          createTypeMut.isPending && 'opacity-60 cursor-not-allowed',
                        )}
                      />
                      <button
                        type="button"
                        aria-label="Открыть список типов техники"
                        className="absolute inset-y-0 right-0 inline-flex items-center pr-1 text-gray-400 hover:text-gray-600"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setIsTypeMenuOpen((prev) => !prev);
                        }}
                      >
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>

                      {isTypeMenuOpen ? (
                        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                          {typesQuery.isLoading ? (
                            <div className="px-2 py-1.5 text-[11px] text-gray-500">Загружаем типы...</div>
                          ) : visibleTypeOptions.length > 0 ? (
                            <div className="max-h-48 overflow-auto py-1">
                              {visibleTypeOptions.map((type) => {
                                const optionLabel = type.category
                                  ? `${type.name} · ${type.category.name}`
                                  : type.name;
                                return (
                                  <button
                                    key={type.id}
                                    type="button"
                                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-gray-50"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      selectTypeOption(type);
                                    }}
                                  >
                                    <span className="truncate">{optionLabel}</span>
                                    {form.equipmentTypeId === type.id ? (
                                      <Check className="ml-auto h-3 w-3 text-blue-600" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : typeQuery.trim().length >= 2 ? (
                            <div className="px-2 py-1.5 text-[11px] text-gray-500">
                              Новый тип «{typeQuery.trim()}» будет создан при сохранении.
                            </div>
                          ) : (
                            <div className="px-2 py-1.5 text-[11px] text-gray-500">
                              Начните вводить, чтобы увидеть подсказки.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {typeCreateError ? (
                      <div className="text-[10px] text-rose-700">{typeCreateError}</div>
                    ) : null}
                    <div className="text-[10px] text-gray-500">
                      Если подсказок нет, введенный тип будет создан при сохранении.
                    </div>
                  </div>
                }
              />
              <PropertyRow
                icon={<FolderTree className="h-3 w-3" />}
                label="Категория"
                value={<span className="text-gray-700">{categoryLabel}</span>}
              />
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Статус"
                value={
                  <FieldSelect
                    value={form.status}
                    onChange={(v) => set('status', v as DirectoryStatus)}
                    options={(Object.keys(STATUS_LABEL) as DirectoryStatus[]).map(
                      (s) => ({ value: s, label: STATUS_LABEL[s] }),
                    )}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Идентификация">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Год выпуска"
                value={
                  <FieldInput
                    type="number"
                    min={1900}
                    value={form.year}
                    onChange={(v) => set('year', v)}
                    placeholder="2019"
                  />
                }
              />
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Гос. номер"
                value={
                  <FieldInput
                    value={form.plateNumber}
                    onChange={(v) => set('plateNumber', v)}
                    placeholder="А123ВС77"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Примечания">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={form.notes}
                  onChange={(v) => set('notes', v)}
                  placeholder="Любые заметки по единице"
                />
              }
            />
          </EntitySection>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          {isEdit ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  void toggleArchive();
                }}
                disabled={updateMut.isPending || deleteMut.isPending}
              >
                {form.status === 'archived' ? 'Активировать' : 'В архив'}
              </Button>
              {canDelete ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    void remove();
                  }}
                  disabled={deleteMut.isPending || updateMut.isPending}
                >
                  {deleteMut.isPending ? 'Удаляем…' : 'Удалить единицу'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </EntityModalShell>
    </ShellDialog>
  );
}

/* ========================================================================== *
 *                               Subcontractor                                *
 * ========================================================================== */

type SubcontractorDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subcontractor?: SubcontractorApi | null;
  initialValues?: {
    name?: string;
    specialization?: string;
    region?: string;
    contactPhone?: string;
    contactEmail?: string;
    notes?: string;
  };
  onCreated?: (subcontractor: SubcontractorApi) => void;
};

type SubForm = {
  name: string;
  specialization: string;
  region: string;
  rating: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  status: DirectoryStatus;
};

const EMPTY_SUB: SubForm = {
  name: '',
  specialization: '',
  region: '',
  rating: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
  status: 'active',
};

export function SubcontractorDialog({
  open,
  onOpenChange,
  subcontractor,
  initialValues,
  onCreated,
}: SubcontractorDialogProps) {
  const { role } = useLayout();
  const canDelete = role === 'admin';
  const [form, setForm] = useState<SubForm>(EMPTY_SUB);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateSubcontractor();
  const updateMut = useUpdateSubcontractor();
  const deleteMut = useDeleteSubcontractor();
  const isEdit = !!subcontractor;
  const mut = isEdit ? updateMut : createMut;

  useEffect(() => {
    if (!open) return;
    if (subcontractor) {
      setForm({
        name: subcontractor.name,
        specialization: subcontractor.specialization ?? '',
        region: subcontractor.region ?? '',
        rating: subcontractor.rating != null ? String(subcontractor.rating) : '',
        contactPhone: subcontractor.contactPhone ?? '',
        contactEmail: subcontractor.contactEmail ?? '',
        notes: subcontractor.notes ?? '',
        status: subcontractor.status,
      });
    } else {
      setForm({ ...EMPTY_SUB, ...initialValues });
    }
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    deleteMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subcontractor?.id, initialValues?.name, initialValues?.specialization, initialValues?.region, initialValues?.contactPhone, initialValues?.contactEmail, initialValues?.notes]);

  const set = <K extends keyof SubForm>(k: K, v: SubForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const nameValid = form.name.trim().length >= 2;

  const dirty = isEdit && subcontractor
    ? form.name.trim() !== subcontractor.name.trim()
      || form.specialization !== (subcontractor.specialization ?? '')
      || form.region !== (subcontractor.region ?? '')
      || form.rating !== (subcontractor.rating != null ? String(subcontractor.rating) : '')
      || form.contactPhone !== (subcontractor.contactPhone ?? '')
      || form.contactEmail !== (subcontractor.contactEmail ?? '')
      || form.notes !== (subcontractor.notes ?? '')
      || form.status !== subcontractor.status
    : nameValid || form.specialization !== '' || form.region !== ''
      || form.rating !== '' || form.contactPhone !== '' || form.contactEmail !== '' || form.notes !== ''
      || form.status !== 'active';
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      status: form.status,
    };
    if (form.specialization.trim()) body.specialization = form.specialization.trim();
    if (form.region.trim()) body.region = form.region.trim();
    if (form.rating.trim()) {
      const parsed = Number(form.rating.trim());
      if (Number.isFinite(parsed)) {
        body.rating = Math.max(0, Math.min(5, Math.round(parsed)));
      }
    }
    if (form.contactPhone.trim()) body.contactPhone = form.contactPhone.trim();
    if (form.contactEmail.trim()) body.contactEmail = form.contactEmail.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    try {
      if (isEdit && subcontractor) {
        await updateMut.mutateAsync({ id: subcontractor.id, body });
      } else {
        const created = await createMut.mutateAsync(body);
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const toggleArchive = async () => {
    if (!isEdit || !subcontractor) return;

    const nextStatus: DirectoryStatus = form.status === 'archived' ? 'active' : 'archived';
    setError(null);
    try {
      await updateMut.mutateAsync({ id: subcontractor.id, body: { status: nextStatus } });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус подрядчика');
    }
  };

  const remove = async () => {
    if (!isEdit || !subcontractor) return;
    const confirmed = globalThis.confirm(`Удалить подрядчика «${subcontractor.name}»?`);
    if (!confirmed) return;

    setError(null);
    try {
      await deleteMut.mutateAsync({ id: subcontractor.id });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить подрядчика');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Building2 className="h-3 w-3 text-gray-500" />}
          entityLabel="Подрядчик"
          title={isEdit ? subcontractor!.name : 'Новый подрядчик'}
          subtitle={
            isEdit
              ? `${subcontractor!.specialization ?? '—'} · ${
                  subcontractor!.region ?? '—'
                } · ${STATUS_LABEL[subcontractor!.status]}`
              : 'Заполните название и контакты, затем сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
                      setTouched(true);
                    }}
                    placeholder="СпецТехПартнёр"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Статус"
                value={
                  <FieldSelect
                    value={form.status}
                    onChange={(v) => set('status', v as DirectoryStatus)}
                    options={(Object.keys(STATUS_LABEL) as DirectoryStatus[]).map(
                      (s) => ({ value: s, label: STATUS_LABEL[s] }),
                    )}
                  />
                }
              />
              <PropertyRow
                icon={<Package className="h-3 w-3" />}
                label="Специализация"
                value={
                  <FieldInput
                    value={form.specialization}
                    onChange={(v) => set('specialization', v)}
                    placeholder="Экскаваторы, краны"
                  />
                }
              />
              <PropertyRow
                icon={<MapPin className="h-3 w-3" />}
                label="Регион"
                value={
                  <FieldInput
                    value={form.region}
                    onChange={(v) => set('region', v)}
                    placeholder="Москва"
                  />
                }
              />
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Рейтинг (0-5)"
                value={
                  <FieldInput
                    type="number"
                    min={0}
                    max={5}
                    step={1}
                    value={form.rating}
                    onChange={(v) => set('rating', v)}
                    placeholder="4"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Контакты">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Phone className="h-3 w-3" />}
                label="Телефон"
                value={
                  <FieldInput
                    type="tel"
                    value={form.contactPhone}
                    onChange={(v) => set('contactPhone', v)}
                    placeholder="+7 (495) 000-00-00"
                  />
                }
              />
              <PropertyRow
                icon={<UserIcon className="h-3 w-3" />}
                label="Эл. почта"
                value={
                  <FieldInput
                    type="email"
                    value={form.contactEmail}
                    onChange={(v) => set('contactEmail', v)}
                    placeholder="info@partner.ru"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Примечания">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={form.notes}
                  onChange={(v) => set('notes', v)}
                  placeholder="Договор, особенности работы"
                />
              }
            />
          </EntitySection>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}

          {isEdit ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  void toggleArchive();
                }}
                disabled={updateMut.isPending || deleteMut.isPending}
              >
                {form.status === 'archived' ? 'Активировать' : 'В архив'}
              </Button>
              {canDelete ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    void remove();
                  }}
                  disabled={deleteMut.isPending || updateMut.isPending}
                >
                  {deleteMut.isPending ? 'Удаляем…' : 'Удалить подрядчика'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </EntityModalShell>
    </ShellDialog>
  );
}
