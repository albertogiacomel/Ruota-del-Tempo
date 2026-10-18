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

export interface ConsentModeV2State {
  ad_storage: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
}

export function getConsentModeV2State(): ConsentModeV2State {
  const adAllowed = hasOptionalConsent('advertising');
  const analyticsAllowed = hasOptionalConsent('analytics');
  return {
    ad_storage: adAllowed ? 'granted' : 'denied',
    analytics_storage: analyticsAllowed ? 'granted' : 'denied',
    ad_user_data: adAllowed ? 'granted' : 'denied',
    ad_personalization: adAllowed ? 'granted' : 'denied',
  };
}
