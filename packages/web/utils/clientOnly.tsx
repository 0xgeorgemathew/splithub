import { type ComponentProps, type ComponentType, type ReactNode, Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";

/**
 * Lazily loads a browser-only component (NFC, wallet SDK heavy) and skips it during SSR,
 * rendering `fallback` on the server and while the chunk loads.
 */
export function clientOnly<T extends ComponentType<any>>(
  load: () => Promise<T>,
  fallback: () => ReactNode = () => null,
) {
  const LazyComponent = lazy(() => load().then(component => ({ default: component })));
  return function ClientOnlyComponent(props: ComponentProps<T>) {
    return (
      <ClientOnly fallback={fallback()}>
        <Suspense fallback={fallback()}>
          <LazyComponent {...props} />
        </Suspense>
      </ClientOnly>
    );
  };
}
