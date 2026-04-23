/**
 * Shell-form primitives — плотные inline-поля для create/edit shell-модалок.
 *
 * Стиль совпадает с detail-view: 11px, borderless hover→border, focus-blue,
 * required-invalid — розовая подсветка. Используется в NewLeadDialog /
 * NewClientDialog / PositionDialog / CatalogDialogs и любых будущих create-shell.
 */

import { type ChangeEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';

export function FieldInput({
  value,
  onChange,
  placeholder,
  invalid,
  type = 'text',
  min,
  max,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  type?: 'text' | 'number' | 'email' | 'tel' | 'date' | 'time';
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full h-6 px-1.5 rounded text-[11px] bg-transparent',
        'outline-none transition-colors',
        'border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white',
        invalid && 'border-rose-300 bg-rose-50/40',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    />
  );
}

export function FieldTextarea({
  value,
  onChange,
  placeholder,
  invalid,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full px-1.5 py-1 rounded text-[11px] bg-transparent resize-none',
        'outline-none transition-colors',
        'border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white',
        invalid && 'border-rose-300 bg-rose-50/40',
      )}
    />
  );
}

export function FieldSelect({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-6 text-[11px] bg-transparent border-transparent hover:border-gray-200',
          invalid && 'border-rose-300 bg-rose-50/40',
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[12px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FieldCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[11px] text-foreground/90 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Обёртка над Dialog — 96vw/92vh layout, крестик закрытия в правом верхнем углу,
 * прокрутка контента. Визуально совпадает с detail-модалками (LeadDetailModal,
 * ReservationWorkspace) — чтобы атомы/молекулы жили в одном шелле.
 */
export function ShellDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 rounded-lg overflow-hidden [&>button]:hidden">
        <div className="relative h-full overflow-auto bg-white">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
