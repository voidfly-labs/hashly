export const LEGAL_UPDATED_ON = '2026-05-01';

export function getLegalUpdatedLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(LEGAL_UPDATED_ON));
}

export function getVendorNotice(libraries) {
  const parts = libraries.map(({ name, url, author }) => {
    const nameHtml = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>` : name;
    return author ? `${nameHtml} by ${author}` : nameHtml;
  });
  const last = parts.pop();
  const joined = parts.length ? parts.join(', ') + ', and ' + last : last;
  const qualifier = libraries.length === 1 ? 'library' : 'set of libraries';
  return `${joined}, an open-source ${qualifier} bundled with this tool that makes no network requests`;
}
