const STORAGE_KEY = 'katet-crm.saved-views.v1';

export type SavedViewSnapshot = {
  moduleId: string;
  view: string;
  query: string;
  filters: Record<string, unknown>;
  preset?: string | null;
  savedAt: string;
  href: string;
};

function readSnapshots(): Record<string, SavedViewSnapshot> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SavedViewSnapshot>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSnapshots(next: Record<string, SavedViewSnapshot>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage write failures
  }
}

export async function saveViewSnapshot(input: {
  moduleId: string;
  view: string;
  query: string;
  filters: Record<string, unknown>;
  preset?: string | null;
}) {
  if (typeof window === 'undefined') return;

  const href = `${window.location.pathname}${window.location.search}`;
  const snapshot: SavedViewSnapshot = {
    moduleId: input.moduleId,
    view: input.view,
    query: input.query,
    filters: input.filters,
    preset: input.preset ?? null,
    savedAt: new Date().toISOString(),
    href,
  };

  const all = readSnapshots();
  all[input.moduleId] = snapshot;
  writeSnapshots(all);

  try {
    await navigator.clipboard.writeText(href);
    window.alert('Вид сохранён. Ссылка на текущий вид скопирована в буфер обмена.');
  } catch {
    window.alert(`Вид сохранён. Ссылка: ${href}`);
  }
}

