export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type StorageStatus = 'empty' | 'persistent' | 'memory' | 'invalid' | 'future';
export interface StoreOptions<T> {
  gameId: string; slot?: string; version?: number; defaults(): T; validate(value: unknown): boolean;
  storage?: StorageLike | (() => StorageLike);
  migrations?: Record<number, (previous: unknown) => unknown>;
  legacy?: Array<{ key: string; parse?(raw: string): unknown; decode(value: unknown): { version: number; data: unknown } }>;
  onError?: (error: unknown, operation: string) => void;
}
export class VersionedStore<T> {
  constructor(options: StoreOptions<T>);
  readonly key: string; readonly version: number; readonly status: StorageStatus;
  load(): T; save(value: T): boolean; reset(): T;
}
export interface GameSettings {
  language: string; theme: 'system' | 'light' | 'dark'; motion: 'system' | 'reduced';
  contrast: 'normal' | 'high'; muted: boolean; effects: boolean; music: boolean; voice: boolean; difficulty: string;
}
export const SETTINGS_DEFAULTS: Readonly<GameSettings>;
export interface SettingsOptions extends Omit<StoreOptions<GameSettings>, 'slot' | 'version' | 'defaults' | 'validate'> {
  defaults?: Partial<GameSettings>; difficulties?: string[]; languages?: string[];
}
export class SettingsStore {
  constructor(options: SettingsOptions);
  readonly status: StorageStatus;
  getSnapshot(): Readonly<GameSettings>; subscribe(listener: () => void): () => void;
  update(patch: Partial<GameSettings>): Readonly<GameSettings>;
  reload(): Readonly<GameSettings>; reset(): Readonly<GameSettings>;
}
export class I18n {
  constructor(catalogs: Record<string, Record<string, string>>, options?: { language?: string; fallback?: string });
  readonly language: string; setLanguage(language: string): void; t(key: string, values?: Record<string, unknown>): string;
}
export const UI_MESSAGES: Readonly<Record<string, Record<string, string>>>;
export class InputManager {
  constructor(options?: {
    target?: EventTarget; document?: Document; navigator?: Pick<Navigator, 'getGamepads'>;
    keys?: Record<string, string>; deadzone?: number;
    gamepad?: Record<string, { axis?: number; direction?: number; buttons?: number[] }>;
  });
  bindButton(element: HTMLElement, action: string): () => void;
  setEnabled(enabled: boolean): void; clear(): void; poll(): Readonly<Record<string, boolean>>; dispose(): void;
}
export class AudioManager {
  constructor(options?: { contextFactory?: () => AudioContext; speech?: SpeechSynthesis;
    Utterance?: typeof SpeechSynthesisUtterance; onError?: (error: unknown) => void });
  unlock(): Promise<boolean>; setPreferences(settings: Partial<GameSettings>): void;
  tone(options?: { frequencies?: number[]; channel?: 'effects' | 'music' | 'voice';
    duration?: number; spacing?: number; volume?: number; wave?: OscillatorType }): boolean;
  speak(text: string, options?: { language?: string; rate?: number }): boolean;
  stop(): void; dispose(): Promise<void>;
}
export class FullscreenController {
  constructor(element: HTMLElement, options?: { document?: Document; onError?: (error: unknown) => void });
  readonly active: boolean; subscribe(listener: (active: boolean) => void): () => void;
  toggle(): Promise<boolean>; dispose(): Promise<void>;
}
export class FixedStepLoop {
  constructor(options: { update(dt: number): void; render(alpha: number): void; hz?: number;
    maxSteps?: number; requestFrame?: (callback: FrameRequestCallback) => number; cancelFrame?: (id: number) => void });
  readonly running: boolean; readonly dt: number; readonly maxSteps: number; readonly droppedSeconds: number;
  advance(timestamp: number): void; start(): void; stop(): void; dispose(): void;
}
export class AssetLoader {
  constructor(options?: { imageFactory?: () => HTMLImageElement });
  load(entries: Record<string, string>, options?: { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void }): Promise<Map<string, HTMLImageElement>>;
}
export class AppearanceController {
  constructor(root: HTMLElement, settings: SettingsStore, options?: { matchMedia?: (query: string) => MediaQueryList });
  dispose(): void;
}
export interface SelectOption { value: string; label?: string; text?: string }
export class SettingsDialog {
  constructor(root: HTMLElement, settings: SettingsStore, options?: {
    i18n?: I18n; channels?: Array<'effects' | 'music' | 'voice'>; difficulties?: SelectOption[];
    languages?: SelectOption[]; confirmReset?: (message: string) => boolean; onError?: (error: unknown) => void;
  });
  readonly element: HTMLDialogElement; open(opener?: HTMLElement): void; close(): void; dispose(): void;
}
export interface GameProfile {
  readonly gameId: string; readonly difficulties: readonly string[]; readonly difficulty: string;
  readonly channels: readonly ('effects' | 'music' | 'voice')[];
}
export const GAME_PROFILES: Readonly<Record<string, GameProfile>>;
export function createGameSettings(gameId: string, options?: Omit<SettingsOptions, 'gameId' | 'difficulties'>): SettingsStore;
