'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { URUGUAY_DEPARTMENTS } from '@/lib/locations';

type Props = {
  value: string | null;
  // Base path a navegar (con ?department=). Default /activities.
  basePath?: string;
};

// Selector de departamento que navega vía query string (?department=). Server-rendered
// list + client navigation: no requiere fetch, la página recarga con el nuevo depto.
export function DepartmentSelect({ value, basePath = '/activities' }: Props) {
  const t = useTranslations('Activities');
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-sm font-medium">{t('departmentLabel')}</span>
      <select
        value={value ?? ''}
        onChange={(e) =>
          router.push(`${basePath}?department=${encodeURIComponent(e.target.value)}`)
        }
        className="border-border bg-background text-foreground focus:ring-ring rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      >
        <option value="" disabled>
          {t('chooseDepartmentTitle')}
        </option>
        {URUGUAY_DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
