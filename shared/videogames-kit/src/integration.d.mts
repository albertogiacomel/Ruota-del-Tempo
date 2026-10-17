import type { SettingsStore, StorageLike, GameSettings, AudioManager, FullscreenController, AppearanceController, SettingsDialog, I18n } from './index.mjs';
export function createIntegratedSettings(gameId: string, options?: { storage?: StorageLike | (() => StorageLike); onError?: (error: unknown, operation: string) => void }): SettingsStore;
export function getGameSettings(gameId: string): SettingsStore;
export function getGameController(gameId: string): GameUIController | undefined;
export function toggleGameFullscreen(gameId: string): Promise<boolean> | undefined;
export class GameUIController {
  constructor(options: { gameId: string; settings?: SettingsStore; root?: HTMLElement; mount?: HTMLElement;
    onOpen?: () => void; onClose?: () => void });
  readonly gameId: string; readonly root: HTMLElement; readonly settings: SettingsStore;
  readonly appearance: AppearanceController; readonly audio: AudioManager;
  readonly fullscreen: FullscreenController; readonly dialog: SettingsDialog; readonly i18n: I18n;
  readonly controls: HTMLDivElement; readonly settingsButton: HTMLButtonElement; readonly fullscreenButton: HTMLButtonElement;
  open(opener?: HTMLElement): void; dispose(): Promise<void>;
}
