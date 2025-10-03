import type { Seccional } from './types.ts';

export enum TaskStatus {
  Pending = 'Pendiente',
  InProgress = 'En Progreso',
  Completed = 'Completado',
  Cancelled = 'Cancelado'
}

export const SECCIONALES_INITIAL: Seccional[] = [
  { name: 'Andalucia' },
  { name: 'Bugalagrande' },
  { name: 'Zarzal' }
];
export const DEFAULT_ADMIN_USER = 'Profesional lll';
