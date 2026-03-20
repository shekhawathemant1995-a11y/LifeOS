
export type Screen = 'onboarding' | 'dashboard' | 'tasks' | 'habits' | 'finance' | 'ai' | 'profile' | 'goals' | 'analytics';

export interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  time?: string;
  category: string;
  completed: boolean;
  date?: string;
  dueDate?: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: string;
  time: string;
  streak: number;
  progress: number;
  target: number;
  unit: string;
  icon: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  progress: number;
  target: number;
  unit: string;
  status: 'In Progress' | 'Active' | 'Completed';
  nextMilestone?: string;
  icon: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  time: string;
  type: 'expense' | 'income';
  icon: string;
}
