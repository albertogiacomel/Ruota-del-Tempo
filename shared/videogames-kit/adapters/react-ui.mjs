import { getGameSettings, GameUIController } from '../src/integration.mjs';

export function createGameBindings(React) {
  const subscribeMedia = listener => {
    const media = matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  };
  const mediaSnapshot = () => matchMedia('(prefers-color-scheme: dark)').matches;
  function useGamePreferences(gameId) {
    const store = getGameSettings(gameId);
    const preferences = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const systemDark = React.useSyncExternalStore(subscribeMedia, mediaSnapshot, () => false);
    const effectiveTheme = preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme;
    return { store, preferences, effectiveTheme };
  }
  function GameKitControls({ gameId, onOpen, onClose }) {
    const host = React.useRef(null), callbacks = React.useRef({ onOpen, onClose });
    callbacks.current = { onOpen, onClose };
    React.useEffect(() => {
      const controller = new GameUIController({ gameId, mount: host.current,
        onOpen: () => callbacks.current.onOpen?.(), onClose: () => callbacks.current.onClose?.() });
      return () => { void controller.dispose().catch(error => console.error('Game UI cleanup:', error)); };
    }, [gameId]);
    return React.createElement('div', { ref: host, className: 'ag-kit-mount' });
  }
  return { useGamePreferences, GameKitControls };
}
