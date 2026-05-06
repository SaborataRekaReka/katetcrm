import { SidebarField, sidebarTokens } from './DetailShell';

export interface RelatedRecordItem {
  label: string;
  text?: string | null;
  onClick?: (() => void) | null;
}

function hasValue(text?: string | null): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}

export function RelatedRecordsFields({
  items,
  emptyText = 'Нет связанных записей',
}: {
  items: RelatedRecordItem[];
  emptyText?: string;
}) {
  const visibleItems = items.filter((item) => hasValue(item.text));

  if (visibleItems.length === 0) {
    return <div className={sidebarTokens.muted}>{emptyText}</div>;
  }

  return (
    <>
      {visibleItems.map((item, index) => (
        <SidebarField
          key={`${item.label}-${index}`}
          label={item.label}
          value={item.onClick ? (
            <button type="button" className={sidebarTokens.link} onClick={item.onClick}>
              {item.text}
            </button>
          ) : (
            <span>{item.text}</span>
          )}
        />
      ))}
    </>
  );
}
