import type { CountdownInfo } from './types.ts';

export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCountdownInfo = (taskDateStr: string): CountdownInfo => {
  const today = new Date();
  // Compare dates at UTC midnight to avoid timezone/DST issues
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const parts = taskDateStr.split('-').map(p => parseInt(p, 10));
  const taskDateUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

  const diffTime = taskDateUTC.getTime() - todayUTC.getTime();
  // Using Math.round is safer for differences that might not be exact 24h multiples (due to DST)
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Atrasado ${Math.abs(diffDays)}d`,
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      days: diffDays,
    };
  }
  if (diffDays === 0) {
    return {
      text: 'Hoy',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      days: diffDays,
    };
  }
  if (diffDays <= 3) {
    return {
      text: `Faltan ${diffDays}d`,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      days: diffDays,
    };
  }
  return {
    text: `Faltan ${diffDays}d`,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    days: diffDays,
  };
};

export const isLastDayOfMonth = (date: Date): boolean => {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  return nextDay.getMonth() !== date.getMonth();
};