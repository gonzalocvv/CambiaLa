// Extrae los campos de texto + el banner de un multipart/form-data de actividad.
// Los strings vacíos se vuelven undefined para que los campos opcionales del schema
// Zod no fallen ni guarden "".
export function extractActivityForm(form: FormData): {
  fields: Record<string, string | undefined>;
  bannerFile: File | null;
} {
  const text = (key: string): string | undefined => {
    const value = form.get(key);
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  };

  const fields = {
    title: text('title'),
    description: text('description'),
    location: text('location'),
    department: text('department'),
    startsAt: text('startsAt'),
    endsAt: text('endsAt'),
  };

  const banner = form.get('banner');
  const bannerFile = banner instanceof File && banner.size > 0 ? banner : null;

  return { fields, bannerFile };
}
