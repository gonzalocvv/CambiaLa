import { describe, expect, it } from 'vitest';

import catalogRaw from '../../../prisma/data/mundial-2026.json';

import { TEAM_NAMES, getTeamDisplay } from '../team-names';

const catalog = catalogRaw as { stickers: { team: string }[] };
const catalogCodes = [...new Set(catalog.stickers.map((s) => s.team))];

describe('TEAM_NAMES', () => {
  it('has an entry for every team code in the catalog', () => {
    for (const code of catalogCodes) {
      expect(TEAM_NAMES, `Missing mapping for team code: ${code}`).toHaveProperty(code);
    }
  });

  it('every entry has a non-empty name and flag', () => {
    for (const [code, info] of Object.entries(TEAM_NAMES)) {
      expect(info.name, `Empty name for ${code}`).toBeTruthy();
      expect(info.flag, `Empty flag for ${code}`).toBeTruthy();
    }
  });
});

describe('getTeamDisplay', () => {
  it('returns flag + name + code for a known team', () => {
    const result = getTeamDisplay('ARG');
    expect(result).toContain('Argentina');
    expect(result).toContain('ARG');
    expect(result).toContain('🇦🇷');
  });

  it('includes the code separator for a known team', () => {
    expect(getTeamDisplay('URU')).toBe('🇺🇾 Uruguay · URU');
  });

  it('returns FWC with trophy and full name', () => {
    const result = getTeamDisplay('FWC');
    expect(result).toContain('Copa del Mundo');
    expect(result).toContain('FWC');
  });

  it('falls back to the raw code for unknown teams', () => {
    expect(getTeamDisplay('XYZ')).toBe('XYZ');
    expect(getTeamDisplay('')).toBe('');
  });
});
