/**
 * ContactAtoms — shared read-only UI для телефонов/email/копируемых значений.
 *
 * Session 13: раньше телефоны и email отображались как статичный текст через
 * `<InlineValue>`, что создавало ощущение «мёртвой» карточки. Теперь они
 * превращаются в ссылки `tel:` / `mailto:` + hover-кнопку «копировать».
 *
 * Компоненты read-only: для редактирования используется `<InlineText required>`
 * в разделе «Основные данные» модалок.
 */
import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

function normalizePhoneForHref(raw: string): string {
  // tel: терпим к пробелам/скобкам, но safer strip всё кроме + и цифр.
  return raw.replace(/[^\d+]/g, '');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallthrough
  }
  // Fallback через textarea.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface CopyButtonProps {
  value: string;
  title?: string;
}

function CopyButton({ value, title = 'Копировать' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? 'Скопировано' : title}
      aria-label={title}
      className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex-shrink-0"
    >
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3" />}
    </button>
  );
}

export interface PhoneLinkProps {
  value: string | null | undefined;
  /** Префикс/иконка перед номером. Необязательно. */
  prefix?: ReactNode;
  /** Текст для пустого значения. По умолчанию — `—` серым. */
  emptyDisplay?: ReactNode;
  className?: string;
}

export function PhoneLink({ value, prefix, emptyDisplay, className }: PhoneLinkProps) {
  if (!value || !value.trim()) {
    return <>{emptyDisplay ?? <span className="text-gray-400 text-[11px]">—</span>}</>;
  }
  const href = `tel:${normalizePhoneForHref(value)}`;
  return (
    <span className={`group inline-flex items-center gap-1 max-w-full ${className ?? ''}`}>
      {prefix}
      <a
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] text-blue-600 hover:underline truncate"
      >
        {value}
      </a>
      <CopyButton value={value} title="Скопировать номер" />
    </span>
  );
}

export interface EmailLinkProps {
  value: string | null | undefined;
  prefix?: ReactNode;
  emptyDisplay?: ReactNode;
  className?: string;
}

export function EmailLink({ value, prefix, emptyDisplay, className }: EmailLinkProps) {
  if (!value || !value.trim()) {
    return <>{emptyDisplay ?? <span className="text-gray-400 text-[11px]">—</span>}</>;
  }
  const href = `mailto:${value.trim()}`;
  return (
    <span className={`group inline-flex items-center gap-1 max-w-full ${className ?? ''}`}>
      {prefix}
      <a
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] text-blue-600 hover:underline truncate"
      >
        {value}
      </a>
      <CopyButton value={value} title="Скопировать эл. почту" />
    </span>
  );
}

export interface CopyableValueProps {
  value: string | null | undefined;
  emptyDisplay?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Read-only значение (например, ID заявки/брони) с hover-кнопкой «копировать».
 * Если children не переданы, выводится `value`.
 */
export function CopyableValue({ value, emptyDisplay, className, children }: CopyableValueProps) {
  if (!value || !value.trim()) {
    return <>{emptyDisplay ?? <span className="text-gray-400 text-[11px]">—</span>}</>;
  }
  return (
    <span className={`group inline-flex items-center gap-1 max-w-full ${className ?? ''}`}>
      <span className="text-[11px] text-gray-800 truncate">{children ?? value}</span>
      <CopyButton value={value} title="Скопировать" />
    </span>
  );
}
