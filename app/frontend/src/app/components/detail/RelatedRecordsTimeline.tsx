import { Fragment } from 'react';
import { sidebarTokens } from './DetailShell';

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
    <div className="space-y-1.5">
      {visibleChains.map((chain, chainIndex) => (
        <div key={`chain-${chainIndex}`} className="rounded-md border border-gray-200 bg-white/80 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {chain.map((node, nodeIndex) => (
              <Fragment key={`${node.stage}-${nodeIndex}`}>
                {nodeIndex > 0 ? <span className="text-[10px] text-gray-300">/</span> : null}
                {node.onClick ? (
                  <button
                    type="button"
                    onClick={node.onClick}
                    className="inline-flex h-5 items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 text-[10px] font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                  >
                    {node.stage}
                  </button>
                ) : (
                  <span className="inline-flex h-5 items-center rounded-full border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-600">
                    {node.stage}
                  </span>
                )}
              </Fragment>
            ))}
          </div>
          {chain.some((node) => hasValue(node.details)) ? (
            <div className="mt-1 space-y-0.5">
              {chain.map((node, nodeIndex) => (
                hasValue(node.details) ? (
                  node.onClick ? (
                    <button
                      key={`${node.stage}-${nodeIndex}-details`}
                      type="button"
                      onClick={node.onClick}
                      className="block max-w-full truncate text-left text-[10px] text-blue-600 hover:underline"
                    >
                      {node.details}
                    </button>
                  ) : (
                    <div key={`${node.stage}-${nodeIndex}-details`} className="truncate text-[10px] text-gray-500">
                      {node.details}
                    </div>
                  )
                ) : null
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}