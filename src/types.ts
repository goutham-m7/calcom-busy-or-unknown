export interface Interval { start: string; end: string }
export interface Query { dateFrom: string; dateTo: string; calendars: string[] }
export interface GraphRequest { id: number; method: string; url: string }
export type Transport = (requests: GraphRequest[]) => Promise<Response>;
export interface Diagnostic { calendar: string; phase: 'initial' | 'retry' | 'page'; reason: string }
export interface ReadResult { busy: Interval[]; errors: Diagnostic[] }
export interface Frame { outerStatus: number; body: unknown; gzip: boolean }
export interface Truth { busy: Interval[]; unknown: string[]; errors: Diagnostic[] }
export interface Fixture { id: string; family: string; query: Query; frames: Frame[]; truth: Truth }
