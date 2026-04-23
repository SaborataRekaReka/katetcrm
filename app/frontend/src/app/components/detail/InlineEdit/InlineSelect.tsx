import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export interface InlineSelectOption<V extends string = string> {
  value: V;
  label: string;
  /** Опциональный иконо-пре́фикс для пункта. */
  icon?: ReactNode;
}

export interface InlineSelectProps<V extends string = string> {
  value: V;
  options: InlineSelectOption<V>[];
  onSave: (next: V) => Promise<unknown>;
  ariaLabel?: string;
  disabled?: boolean;
  /** Кастомный рендер в read-режиме. По умолчанию — label выбранной опции. */
  renderValue?: (value: V, option?: InlineSelectOption<V>) => ReactNode;
  /** Отображение при отсутствии значения. */
  emptyDisplay?: ReactNode;
  className?: string;
}

/**
 * Инлайн-редактирование enum-поля через shadcn Select.
 *
 * Поведение: отдельной read-фазы с клик-в-edit нет — сам SelectTrigger
 * выглядит как компактный pill-контрол, кликается и открывает список.
 * На выбор сразу дёргаем onSave и показываем спиннер. Esc / клик вне —
 * закрывают меню и откатывают черновик.
 */
export function InlineSelect<V extends string = string>({
  value,
  options,
  onSave,
  ariaLabel,
  disabled = false,
  renderValue,
  emptyDisplay,
  className,
}: InlineSelectProps<V>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internal, setInternal] = useState<V>(value);
  const committingRef = useRef(false);

  useEffect(() => setInternal(value), [value]);

  const selected = options.find((o) => o.value === internal);

  const handleChange = async (next: string) => {
    if (committingRef.current) return;
    if (next === value) return;
    committingRef.current = true;
    const prev = internal;
    setInternal(next as V);
    setPending(true);
    setError(null);
    try {
      await onSave(next as V);
    } catch (err) {
      setInternal(prev);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setPending(false);
      committingRef.current = false;
    }
  };

  if (disabled) {
    return (
      <span className={`text-[11px] text-gray-700 ${className ?? ''}`.trim()}>
        {selected
          ? renderValue
            ? renderValue(internal, selected)
            : selected.label
          : emptyDisplay ?? <span className="text-gray-400 italic">—</span>}
      </span>
    );
  }

  return (
    <div className="relative inline-flex max-w-full items-center">
      <Select value={internal} onValueChange={(v) => void handleChange(v)} disabled={pending}>
        <SelectTrigger
          aria-label={ariaLabel}
          className={
            'h-6 gap-1 rounded border-transparent bg-transparent px-1 py-0 text-[11px] text-gray-700 hover:bg-gray-100 focus:border-blue-400 focus:ring-0 [&>svg]:hidden ' +
            (className ?? '')
          }
        >
          <SelectValue>
            <span className="inline-flex items-center gap-1 truncate">
              {selected
                ? renderValue
                  ? renderValue(internal, selected)
                  : (
                    <>
                      {selected.icon}
                      <span className="truncate">{selected.label}</span>
                    </>
                  )
                : emptyDisplay ?? <span className="text-gray-400 italic">—</span>}
            </span>
          </SelectValue>
          <ChevronDown className="ml-0.5 h-3 w-3 text-gray-400" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="inline-flex items-center gap-1.5">
                {o.icon}
                {o.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <Loader2 className="absolute -right-4 top-1 h-3 w-3 animate-spin text-blue-500" />
      ) : null}
      {error ? (
        <span
          className="absolute left-0 top-full mt-0.5 text-[10px] text-red-600"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
