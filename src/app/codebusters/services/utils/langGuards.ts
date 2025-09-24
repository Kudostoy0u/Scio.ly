export const isLangObject = (val: unknown): val is { en: any[]; es: any[] } =>
  !!val && typeof val === 'object' && Array.isArray((val as any).en) && Array.isArray((val as any).es);


