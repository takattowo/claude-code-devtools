export const DEFAULT_REDACT_PATTERNS: string[] = [
  'sk-[A-Za-z0-9_-]{20,}',
  'sk-ant-[A-Za-z0-9_-]{20,}',
  'ghp_[A-Za-z0-9]{36}',
  'gho_[A-Za-z0-9]{36}',
  'github_pat_[A-Za-z0-9_]{82}',
  'xoxb-[\\d-]+[A-Za-z0-9-]+',
  'xoxp-[\\d-]+[A-Za-z0-9-]+',
  'AKIA[0-9A-Z]{16}',
  'AIza[0-9A-Za-z_-]{35}',
];

export const REDACTED_TOKEN = '[REDACTED]';

export interface RedactorOptions {
  patterns?: string[];
  includeDefaults?: boolean;
}

export class Redactor {
  private readonly regex: RegExp | null;

  constructor(opts: RedactorOptions = {}) {
    const includeDefaults = opts.includeDefaults !== false;
    const all = [
      ...(includeDefaults ? DEFAULT_REDACT_PATTERNS : []),
      ...(opts.patterns ?? []),
    ];
    if (all.length === 0) {
      this.regex = null;
      return;
    }
    const combined = all.map((p) => `(?:${p})`).join('|');
    this.regex = new RegExp(combined, 'g');
  }

  apply(value: string | null | undefined): string | null | undefined {
    if (value == null || this.regex === null) return value;
    this.regex.lastIndex = 0;
    return value.replace(this.regex, REDACTED_TOKEN);
  }

  applyDeep<T>(value: T): T {
    if (this.regex === null || value == null) return value;
    if (typeof value === 'string') return this.apply(value) as T;
    if (Array.isArray(value)) return value.map((v) => this.applyDeep(v)) as T;
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.applyDeep(v);
      }
      return out as T;
    }
    return value;
  }

  get enabled(): boolean {
    return this.regex !== null;
  }
}
