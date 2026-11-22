import { Currency } from '../types';

export interface GeoLocationInfo {
  countryCode: string;
  countryName: string;
  currency: Currency;
  isAutoDetected: boolean;
  timeZone: string;
}

export function detectUserGeoCurrency(): GeoLocationInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = navigator.language || '';

    // If timezone is Dhaka or locale is Bengali / BD
    if (
      tz.toLowerCase().includes('dhaka') ||
      tz.toLowerCase().includes('bangladesh') ||
      locale.toLowerCase().includes('bn') ||
      locale.toLowerCase().includes('bd')
    ) {
      return {
        countryCode: 'BD',
        countryName: 'Bangladesh',
        currency: 'BDT',
        isAutoDetected: true,
        timeZone: tz || 'Asia/Dhaka',
      };
    }

    // Default to International (USD)
    return {
      countryCode: 'GLOBAL',
      countryName: 'International',
      currency: 'USD',
      isAutoDetected: true,
      timeZone: tz || 'UTC',
    };
  } catch (e) {
    return {
      countryCode: 'GLOBAL',
      countryName: 'International',
      currency: 'USD',
      isAutoDetected: false,
      timeZone: 'UTC',
    };
  }
}
