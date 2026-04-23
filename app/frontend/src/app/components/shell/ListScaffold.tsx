import { ReactNode } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';

interface ListScaffoldProps {
  toolbar?: ReactNode;
  /** Optional thin hint/info strip between toolbar and content. */
  hint?: ReactNode;
  children: ReactNode;
}

/**
 * Standard layout for every list/table screen:
 *   WorkspaceHeader (title + tabs)
 *   Compact toolbar
 *   [optional hint strip]
 *   Scrollable content
 */
export function ListScaffold({ toolbar, hint, children }: ListScaffoldProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <WorkspaceHeader />
      {toolbar}
      {hint}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
