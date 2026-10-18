import type * as React from 'react';
import type { SettingsStore, GameSettings } from '../src/index.js';
export function createReactBindings(react: typeof React): {
  useSettings(store: SettingsStore, serverSnapshot?: () => Readonly<GameSettings>): Readonly<GameSettings>;
  useController<T extends { dispose(): void | Promise<void> }>(
    factory: () => T, dependencies: React.DependencyList, onError?: (error: unknown) => void
  ): React.MutableRefObject<T | null>;
};
