import {
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Loader2 } from 'lucide-react';

export interface InlineDateProps {
  /** YYYY-MM-DD или пустая строка. */
  value: string;
  onSave: (next: string) => Promise<unknown>;
  ariaLabel?: string;
  disabled?: boolean;
  /** Что показывать, когда value пустое. */
  emptyDisplay?: React.ReactNode;
  className?: string;
}

function formatRu(iso: string): string {
  if (!iso) return '';
  // Ждём ISO (YYYY-MM-DD) или полный ISO — берём первые 10 символов.
  const source = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const d = new Date(source + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU');
}

/**
 * Инлайн-редактирование даты через native `<input type="date">`.
 * Save на blur / Enter, Esc — revert.
 */
export function InlineDate({
  value,
  onSave,
  ariaLabel,
  disabled = false,
  emptyDisplay,
  className,
}: InlineDateProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const committingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedValue = value ? value.slice(0, 10) : '';

  useEffect(() => {
    if (!editing) setDraft(normalizedValue);
  }, [normalizedValue, editing]);

  useLayoutEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = async () => {
    if (committingRef.current) return;
    if (draft === normalizedValue) {
      setEditing(false);
      setError(null);
      return;
    }
    committingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setPending(false);
      committingRef.current = false;
    }
  };

  const cancel = () => {
    setDraft(normalizedValue);
    setEditing(false);
    setError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    }
  };

  if (!editing) {
    const hasValue = !!normalizedValue;
    const classes = [
      'inline-flex items-center gap-1 text-[11px] text-gray-700 rounded px-1 -mx-1 min-h-[20px]',
      disabled ? 'cursor-default' : 'cursor-text hover:bg-gray-100 transition-colors',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        className={classes}
      >
        {hasValue
          ? formatRu(normalizedValue)
          : emptyDisplay ?? <span className="text-gray-400 italic">—</span>}
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-start gap-1">
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={onKeyDown}
        disabled={pending}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        className={
          'rounded border px-1.5 py-0.5 text-[11px] text-gray-900 outline-none transition-colors ' +
          (error
            ? 'border-red-400 focus:border-red-500 bg-red-50/40'
            : 'border-blue-400 focus:border-blue-500 bg-white')
        }
      />
      {pending ? <Loader2 className="absolute right-1 top-1 h-3 w-3 animate-spin text-blue-500" /> : null}
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
