import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';

type Handler = () => void;

type PrimaryCtaContextValue = {
  getHandler: (secondaryId: string) => Handler | null;
  register: (secondaryId: string, handler: Handler) => () => void;
};

const PrimaryCtaContext = createContext<PrimaryCtaContextValue | null>(null);

export function PrimaryCtaProvider({ children }: { children: ReactNode }) {
  // Per-id slot holding the latest handler. Keeps registrations stable while
  // consumers can pass a fresh arrow function on every render without
  // triggering register/unregister cycles.
  const registryRef = useRef<Map<string, { current: Handler }>>(new Map());
  // Bump only when the set of registered ids changes (add/remove), so memoized
  // `usePrimaryCta` recomputes then — not on every handler swap.
  const [idsVersion, setIdsVersion] = useState(0);

  const register = useCallback((secondaryId: string, handler: Handler) => {
    const existing = registryRef.current.get(secondaryId);
    if (existing) {
      existing.current = handler;
      return () => {
        const slot = registryRef.current.get(secondaryId);
        if (slot && slot.current === handler) {
          registryRef.current.delete(secondaryId);
          setIdsVersion((v) => v + 1);
        }
      };
    }
    registryRef.current.set(secondaryId, { current: handler });
    setIdsVersion((v) => v + 1);
    return () => {
      const slot = registryRef.current.get(secondaryId);
      if (slot && slot.current === handler) {
        registryRef.current.delete(secondaryId);
        setIdsVersion((v) => v + 1);
      }
    };
  }, []);

  const getHandler = useCallback(
    (secondaryId: string) => {
      const slot = registryRef.current.get(secondaryId);
      return slot ? slot.current : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsVersion],
  );

  const value = useMemo<PrimaryCtaContextValue>(
    () => ({ getHandler, register }),
    [getHandler, register],
  );

  return <PrimaryCtaContext.Provider value={value}>{children}</PrimaryCtaContext.Provider>;
}

export function usePrimaryCta(secondaryId: string): Handler | null {
  const ctx = useContext(PrimaryCtaContext);
  if (!ctx) return null;
  return useMemo(() => ctx.getHandler(secondaryId), [ctx, secondaryId]);
}

/**
 * Register a primary CTA handler for the given secondaryId while the component
 * is mounted. Safe to pass a fresh arrow every render: the handler is tracked
 * via a ref that updates on every render, and register/unregister runs only
 * when secondaryId changes or the handler flips between present and null.
 */
export function useRegisterPrimaryCta(secondaryId: string, handler: Handler | null) {
  const ctx = useContext(PrimaryCtaContext);
  const latestRef = useRef<Handler | null>(handler);
  latestRef.current = handler;

  const hasHandler = handler !== null;

  useEffect(() => {
    if (!ctx || !hasHandler) return;
    const wrapper: Handler = () => {
      const fn = latestRef.current;
      if (fn) fn();
    };
    return ctx.register(secondaryId, wrapper);
  }, [ctx, secondaryId, hasHandler]);
}
