import { TaskStatus } from './constants.ts';

export interface Seccional {
  name: string;
  password?: string;
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  status: TaskStatus;
  seccional: string;
  isPriority: boolean;
  comments?: string[];
  cancellationReason?: string;
}

export interface DailyObservation {
    date: string; // YYYY-MM-DD
    seccional: string;
    text: string;
}

export interface CountdownInfo {
  text: string;
  color: string;
  days: number;
}

export interface UpcomingPriorityTask extends Task {
  countdown: CountdownInfo;
}

export interface OverdueTask extends Task {
  countdown: CountdownInfo;
}

export interface MonthlyReportData {
  summary: string;
  improvementPoints: string[];
  seccionalPerformance: {
    seccional: string;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    cancelledTasks: number;
    totalTasks: number;
  }[];
  overallMetrics: {
    completed: number;
    inProgress: number;
    pending: number;
    cancelled: number;
    total: number;
  };
}