import type * as React from 'react';
import type { SettingsStore, GameSettings } from '../src/index.mjs';
export function createGameBindings(react: typeof React): {
  useGamePreferences(gameId: string): { store: SettingsStore; preferences: Readonly<GameSettings>; effectiveTheme: 'light' | 'dark' };
  GameKitControls: React.FC<{ gameId: string; onOpen?: () => void; onClose?: () => void }>;
};
