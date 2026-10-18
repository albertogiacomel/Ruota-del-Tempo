/** Inject the host React; no React dependency is loaded by the core. */
export function createReactBindings(React) {
  const { useSyncExternalStore, useEffect, useRef } = React;
  function useSettings(store, serverSnapshot) {
    return useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot ?? store.getSnapshot);
  }
  function useController(factory, dependencies, onError = error => console.error('Controller cleanup:', error)) {
    const ref = useRef(null);
    useEffect(() => {
      const controller = factory(); ref.current = controller;
      return () => { ref.current = null; Promise.resolve(controller.dispose()).catch(onError); };
    }, dependencies);
    return ref;
  }
  return Object.freeze({ useSettings, useController });
}
