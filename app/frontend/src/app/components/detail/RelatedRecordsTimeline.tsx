import { Fragment } from 'react';
import { sidebarTokens } from './DetailShell';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export interface RelatedChainNode {
  stage: string;
  details?: string | null;
  onClick?: (() => void) | null;
}

export type RelatedRecordChain = RelatedChainNode[];

function hasValue(value?: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function RelatedRecordsTimeline({
  chains,
  emptyText = 'Нет связанных записей',
}: {
  chains: RelatedRecordChain[];
  emptyText?: string;
}) {
  const visibleChains = chains.filter((chain) => chain.length > 0);

  if (visibleChains.length === 0) {
    return <div className={sidebarTokens.muted}>{emptyText}</div>;
  }

  return (
    <div className="space-y-1">
      {visibleChains.map((chain, chainIndex) => (
        <div key={`chain-${chainIndex}`} className="py-0.5">
          <div className="relative inline-flex w-fit items-center gap-2.5">
            {chain.length > 1 ? (
              <div
                className="pointer-events-none absolute left-2.5 right-2.5 top-1/2 h-px -translate-y-1/2 bg-blue-200"
                aria-hidden="true"
              />
            ) : null}

            {chain.map((node, nodeIndex) => {
              const isClickable = !!node.onClick;
              return (
                <Fragment key={`${node.stage}-${nodeIndex}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isClickable ? (
                        <button
                          type="button"
                          onClick={node.onClick ?? undefined}
                          className="relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          aria-label={`Открыть: ${node.stage}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full border border-blue-600 bg-blue-500 transition-colors hover:bg-blue-600" />
                        </button>
                      ) : (
                        <span
                          className="relative z-10 inline-flex h-5 w-5 items-center justify-center"
                          aria-label={node.stage}
                        >
                          <span className="h-2.5 w-2.5 rounded-full border border-blue-500 bg-blue-400" />
                        </span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      <div className="text-[11px]">
                        <div className="font-semibold">{node.stage}</div>
                        {hasValue(node.details) ? (
                          <div className="opacity-90">{node.details}</div>
                        ) : null}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}