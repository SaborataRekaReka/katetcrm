import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Loader2 } from 'lucide-react';

export interface InlineTextProps {
  /** Текущее серверное значение. При его изменении черновик сбрасывается,
   * если поле не в режиме редактирования. */
  value: string;
  /** Сохранение нового значения. Должен возвращать Promise:
   *  - resolve → компонент выходит из edit-режима;
   *  - reject → остаёмся в edit-режиме, показываем ошибку. */
  onSave: (next: string) => Promise<unknown>;
  /** Заголовок для aria / тултипа (имя поля). */
  ariaLabel?: string;
  /** Подсказка в input. */
  placeholder?: string;
  /** Как отобразить пустое значение в read-режиме. По умолчанию — серый курсив «—». */
  emptyDisplay?: ReactNode;
  /** Многострочный ввод (textarea). */
  multiline?: boolean;
  /** Полностью отключает редактирование (RBAC / нет API). */
  disabled?: boolean;
  /** Обязательное поле: пустая строка не сохраняется, возвращается к исходному значению. */
  required?: boolean;
  /** Ограничение длины. */
  maxLength?: number;
  /** Кастомный рендер значения в read-режиме (например, ссылка на клиента). */
  renderValue?: (value: string) => ReactNode;
  /** Доп. классы для read-версии. */
  className?: string;
}

/**
 * Инлайн-редактирование строкового поля (ClickUp-style).
 *
 * UX:
 *  - клик по read-представлению → превращается в input с автофокусом и
 *    выделением текста (только для single-line);
 *  - Enter в single-line → save; в textarea — перевод строки, Ctrl/Cmd+Enter save;
 *  - Esc → отмена;
 *  - blur → save (если значение изменилось), либо молчаливый revert;
 *  - во время save блокируем поле и показываем спиннер в углу;
 *  - на ошибке показываем красную рамку + остаёмся в edit-режиме.
 */
export function InlineText({
  value,
  onSave,
  ariaLabel,
  placeholder,
  emptyDisplay,
  multiline = false,
  disabled = false,
  required = false,
  maxLength,
  renderValue,
  className,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const committingRef = useRef(false); // защита от двойного save при Enter+blur
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Серверное значение изменилось вне edit — обновим draft.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useLayoutEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing, multiline]);

  const commit = async () => {
    if (committingRef.current) return;
    const trimmed = draft;
    if (trimmed === value) {
      setEditing(false);
      setError(null);
      return;
    }
    if (required && trimmed.trim().length === 0) {
      // Обязательное поле — откат.
      setDraft(value);
      setEditing(false);
      setError(null);
      return;
    }
    committingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setPending(false);
      committingRef.current = false;
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === 'Enter') {
      if (multiline && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      void commit();
    }
  };

  if (!editing) {
    const hasValue = value && value.trim().length > 0;
    const classes = [
      'inline-flex min-h-[20px] max-w-full items-center gap-1 rounded px-1 text-[11px] text-gray-700',
      disabled
        ? 'cursor-default'
        : 'cursor-text hover:bg-gray-100 transition-colors',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title={disabled ? ariaLabel : `${ariaLabel ?? 'Редактировать'} (клик)`}
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={classes}
      >
        <span className="truncate text-left">
          {hasValue
            ? renderValue
              ? renderValue(value)
              : value
            : emptyDisplay ?? <span className="text-gray-400 italic">—</span>}
        </span>
      </button>
    );
  }

  const commonClass =
    'w-full rounded border px-1.5 py-0.5 text-[11px] text-gray-900 outline-none transition-colors ' +
    (error
      ? 'border-red-400 focus:border-red-500 bg-red-50/40'
      : 'border-blue-400 focus:border-blue-500 bg-white');

  return (
    <div className="relative inline-flex w-full items-start gap-1">
      {multiline ? (
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={pending}
          rows={3}
          className={commonClass + ' resize-y min-h-[48px]'}
          aria-label={ariaLabel}
          aria-invalid={!!error}
        />
      ) : (
        <input
          ref={(el) => {
            inputRef.current = el;
          }}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={pending}
          className={commonClass}
          aria-label={ariaLabel}
          aria-invalid={!!error}
        />
      )}
      {pending ? (
        <Loader2 className="absolute right-1 top-1 h-3 w-3 animate-spin text-blue-500" />
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
