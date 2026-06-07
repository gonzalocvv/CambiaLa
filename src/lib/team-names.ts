export interface TeamInfo {
  name: string;
  flag: string;
}

export const TEAM_NAMES: Record<string, TeamInfo> = {
  ALG: { name: 'Argelia', flag: '🇩🇿' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  AUT: { name: 'Austria', flag: '🇦🇹' },
  BEL: { name: 'Bélgica', flag: '🇧🇪' },
  BRA: { name: 'Brasil', flag: '🇧🇷' },
  CAN: { name: 'Canadá', flag: '🇨🇦' },
  CIV: { name: 'Costa de Marfil', flag: '🇨🇮' },
  CMR: { name: 'Camerún', flag: '🇨🇲' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  CRC: { name: 'Costa Rica', flag: '🇨🇷' },
  CRO: { name: 'Croacia', flag: '🇭🇷' },
  CZE: { name: 'Chequia', flag: '🇨🇿' },
  DEN: { name: 'Dinamarca', flag: '🇩🇰' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  EGY: { name: 'Egipto', flag: '🇪🇬' },
  ENG: { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  ESP: { name: 'España', flag: '🇪🇸' },
  FRA: { name: 'Francia', flag: '🇫🇷' },
  FWC: { name: 'Copa del Mundo', flag: '🏆' },
  GER: { name: 'Alemania', flag: '🇩🇪' },
  GHA: { name: 'Ghana', flag: '🇬🇭' },
  HON: { name: 'Honduras', flag: '🇭🇳' },
  IDN: { name: 'Indonesia', flag: '🇮🇩' },
  IRN: { name: 'Irán', flag: '🇮🇷' },
  ITA: { name: 'Italia', flag: '🇮🇹' },
  JOR: { name: 'Jordania', flag: '🇯🇴' },
  JPN: { name: 'Japón', flag: '🇯🇵' },
  KOR: { name: 'Corea del Sur', flag: '🇰🇷' },
  KSA: { name: 'Arabia Saudita', flag: '🇸🇦' },
  MAR: { name: 'Marruecos', flag: '🇲🇦' },
  MEX: { name: 'México', flag: '🇲🇽' },
  NED: { name: 'Países Bajos', flag: '🇳🇱' },
  NGA: { name: 'Nigeria', flag: '🇳🇬' },
  NZL: { name: 'Nueva Zelanda', flag: '🇳🇿' },
  PAN: { name: 'Panamá', flag: '🇵🇦' },
  PAR: { name: 'Paraguay', flag: '🇵🇾' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  RSA: { name: 'Sudáfrica', flag: '🇿🇦' },
  SCO: { name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  SRB: { name: 'Serbia', flag: '🇷🇸' },
  SUI: { name: 'Suiza', flag: '🇨🇭' },
  TUN: { name: 'Túnez', flag: '🇹🇳' },
  TUR: { name: 'Turquía', flag: '🇹🇷' },
  UAE: { name: 'Emiratos Árabes Unidos', flag: '🇦🇪' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  USA: { name: 'Estados Unidos', flag: '🇺🇸' },
  VEN: { name: 'Venezuela', flag: '🇻🇪' },
};

export function getTeamDisplay(code: string): string {
  const info = TEAM_NAMES[code];
  if (!info) return code;
  return `${info.flag} ${info.name} · ${code}`;
}
