// Geolocation and regional pricing detection utility for M R S Platform

export interface UserRegionInfo {
  countryCode: string;
  countryName: string;
  currency: 'USD' | 'BDT';
  currencySymbol: string;
  isBangladesh: boolean;
  detectedSource: 'timezone' | 'locale' | 'browser';
  exchangeRate: number; // 1 USD in BDT
}

export function detectUserRegion(defaultRate = 100): UserRegionInfo {
  let isBangladesh = false;
  let countryCode = 'US';
  let countryName = 'Global / International';
  let currency: 'USD' | 'BDT' = 'USD';
  let currencySymbol = '$';
  let detectedSource: UserRegionInfo['detectedSource'] = 'browser';

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const userLocale = (navigator.languages && navigator.languages[0]) || navigator.language || '';

    // Check timezone for Bangladesh
    if (timeZone.toLowerCase().includes('dhaka') || timeZone.toLowerCase().includes('bangladesh')) {
      isBangladesh = true;
      countryCode = 'BD';
      countryName = 'Bangladesh';
      currency = 'BDT';
      currencySymbol = '৳';
      detectedSource = 'timezone';
    } else if (userLocale.toLowerCase().includes('bn') || userLocale.toLowerCase().includes('bd')) {
      isBangladesh = true;
      countryCode = 'BD';
      countryName = 'Bangladesh';
      currency = 'BDT';
      currencySymbol = '৳';
      detectedSource = 'locale';
    } else if (timeZone.toLowerCase().includes('london') || timeZone.toLowerCase().includes('europe/london')) {
      countryCode = 'GB';
      countryName = 'United Kingdom';
      currency = 'USD'; // Base international currency
      currencySymbol = '$';
      detectedSource = 'timezone';
    } else if (timeZone.toLowerCase().includes('new_york') || timeZone.toLowerCase().includes('los_angeles') || timeZone.toLowerCase().includes('chicago')) {
      countryCode = 'US';
      countryName = 'United States';
      currency = 'USD';
      currencySymbol = '$';
      detectedSource = 'timezone';
    }
  } catch (err) {
    // Graceful fallback to default
  }

  return {
    countryCode,
    countryName,
    currency,
    currencySymbol,
    isBangladesh,
    detectedSource,
    exchangeRate: defaultRate,
  };
}
