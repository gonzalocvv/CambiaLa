const RTF = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (diffSec < 60) return RTF.format(-diffSec, 'second');
  if (diffMin < 60) return RTF.format(-diffMin, 'minute');
  if (diffHour < 24) return RTF.format(-diffHour, 'hour');
  if (diffDay < 30) return RTF.format(-diffDay, 'day');
  if (diffMonth < 12) return RTF.format(-diffMonth, 'month');
  return RTF.format(-diffYear, 'year');
}
