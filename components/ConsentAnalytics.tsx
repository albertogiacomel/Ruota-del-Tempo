'use client';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { hasOptionalConsent, subscribeOptionalConsent } from '../shared/site-privacy';

export default function ConsentAnalytics() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed(hasOptionalConsent('analytics'));
    update();
    return subscribeOptionalConsent(update);
  }, []);
  return allowed ? <Analytics /> : null;
}
