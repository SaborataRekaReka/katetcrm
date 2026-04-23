import { ReactNode } from 'react';
import { cn } from '../../ui/utils';

/**
 * Scrollable page surface for overview / home / control / settings screens.
 * Sits inside `ListScaffold` and provides:
 *   - Soft neutral page background (so WidgetCards read as surfaces)
 *   - Consistent max-width content column
 *   - Consistent outer padding and vertical rhythm
 */
export function DashboardPage({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-auto bg-[#f7f8fa]', className)}>
      <div className={cn('mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-5', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
