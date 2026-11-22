// Link and Sharing helpers for M R S Platform (Part 1 of update)

function getBase(url?: string): string {
  if (url) return url.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function getServicePageUrl(siteBaseOrSlug: string, maybeSlug?: string): string {
  if (maybeSlug) {
    const base = getBase(siteBaseOrSlug);
    return `${base}/services/${maybeSlug}`;
  }
  return `${getBase()}/services/${siteBaseOrSlug}`;
}

export function getServiceShortUrl(siteBaseOrId: string, maybeId?: string): string {
  if (maybeId) {
    const base = getBase(siteBaseOrId);
    return `${base}/s/${maybeId}`;
  }
  return `${getBase()}/s/${siteBaseOrId}`;
}

export function getServiceOrderUrl(siteBaseOrId: string, maybeIdOrRef?: string, maybeRef?: string): string {
  if (maybeRef !== undefined) {
    const base = getBase(siteBaseOrId);
    const refQuery = maybeRef ? `?ref=${encodeURIComponent(maybeRef)}` : '';
    return `${base}/order/${maybeIdOrRef}${refQuery}`;
  }
  if (maybeIdOrRef && !maybeIdOrRef.startsWith('?')) {
    // Two arguments: could be (base, id) or (id, ref)
    if (siteBaseOrId.startsWith('http')) {
      return `${getBase(siteBaseOrId)}/order/${maybeIdOrRef}`;
    }
    return `${getBase()}/order/${siteBaseOrId}?ref=${encodeURIComponent(maybeIdOrRef)}`;
  }
  return `${getBase()}/order/${siteBaseOrId}`;
}

export function getInvoicePayUrl(siteBaseOrInvoiceId: string, maybeInvoiceId?: string): string {
  if (maybeInvoiceId) {
    return `${getBase(siteBaseOrInvoiceId)}/pay/${maybeInvoiceId}`;
  }
  return `${getBase()}/pay/${siteBaseOrInvoiceId}`;
}

export function getQrCodeUrl(targetUrl: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}&margin=10`;
}

export function getServiceQrUrl(serviceIdOrUrl: string, size = 200): string {
  const targetUrl = serviceIdOrUrl.startsWith('http')
    ? serviceIdOrUrl
    : getServiceShortUrl(serviceIdOrUrl);
  return getQrCodeUrl(targetUrl, size);
}

export function getShareUrls(title: string, url: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — Verified Professional Digital Solutions via M R S: `);

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this service on M R S:\n\n${title}\n${url}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
  };
}
