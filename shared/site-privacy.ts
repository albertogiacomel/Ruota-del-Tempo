export type OptionalService = 'advertising' | 'google-fonts' | 'google-ai' | 'analytics';

export function hasOptionalConsent(service: OptionalService): boolean {
  if (typeof document === 'undefined') return false;
  const key = 'privacy' + service.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  return document.documentElement.dataset[key] === 'allowed';
}

export function subscribeOptionalConsent(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('siteprivacychange', listener);
  return () => window.removeEventListener('siteprivacychange', listener);
}
