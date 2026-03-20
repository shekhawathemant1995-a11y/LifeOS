
export type Screen = 'onboarding' | 'dashboard' | 'tasks' | 'habits' | 'finance' | 'ai' | 'profile' | 'goals' | 'analytics';

export interface Task {
  id: string;
  uid: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  time?: string;
  category: string;
  completed: boolean;
  date?: string;
  dueDate?: string;
  createdAt?: any;
}

export interface Habit {
  id: string;
  uid: string;
  title: string;
  frequency: string;
  time: string;
  streak: number;
  progress: number;
  target: number;
  unit: string;
  icon: string;
  createdAt?: any;
  lastUpdated?: any;
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  category: string;
  progress: number;
  target: number;
  unit: string;
  status: 'In Progress' | 'Active' | 'Completed';
  nextMilestone?: string;
  icon: string;
  createdAt?: any;
}

export interface Transaction {
  id: string;
  uid: string;
  merchant: string;
  category: string;
  amount: number;
  time: string;
  type: 'expense' | 'income';
  icon: string;
  date?: string;
  createdAt?: any;
}

export interface AIMessage {
  id: string;
  uid: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  createdAt: any;
  insights?: boolean;
}
