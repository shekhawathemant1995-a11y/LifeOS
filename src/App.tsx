import { 
  Home, 
  CheckCircle2, 
  Bot, 
  CreditCard, 
  User as UserIcon, 
  Search, 
  Bell, 
  TrendingUp, 
  Utensils, 
  Flag, 
  Bolt, 
  Activity, 
  PieChart, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Plus,
  ArrowRight,
  ArrowLeft,
  Circle,
  BookOpen,
  Brain,
  Droplets,
  BadgeCheck,
  Lightbulb,
  Music,
  CalendarClock,
  Wallet,
  ShoppingCart,
  Zap,
  PlusCircle,
  ArrowUp,
  LineChart,
  Sparkles,
  Palette,
  Shield,
  X,
  BellOff,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect, useCallback, ReactNode, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Task, Habit, Goal, Transaction } from './types';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import Markdown from 'react-markdown';

// --- Firebase Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = `Security Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="text-error mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Application Error</h2>
          <p className="text-on-surface-variant mb-6 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Mock Data
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Finalize Project Proposal', priority: 'high', time: '10:00 AM', category: 'Work', completed: false, dueDate: '2026-03-25' },
  { id: '2', title: 'Weekly sync with the design team', priority: 'medium', time: '02:30 PM', category: 'Work', completed: false, dueDate: '2026-03-22' },
  { id: '3', title: 'Review updated brand guidelines', priority: 'low', time: '04:00 PM', category: 'Work', completed: false, dueDate: '2026-03-28' },
  { id: '4', title: 'Buy organic espresso beans', priority: 'low', category: 'Personal', completed: true, dueDate: '2026-03-20' },
  { id: '5', title: 'Draft AI interaction system documentation', priority: 'medium', category: 'Work', completed: true, dueDate: '2026-03-21' },
];

const MOCK_HABITS: Habit[] = [
  { id: '1', title: 'Morning Workout', frequency: 'Daily', time: '6:30 AM', streak: 12, progress: 4, target: 5, unit: 'sessions', icon: 'fitness_center' },
  { id: '2', title: 'Reading', frequency: 'Daily', time: '20 mins', streak: 7, progress: 3, target: 7, unit: 'days', icon: 'menu_book' },
  { id: '3', title: 'Deep Work', frequency: 'Weekdays', time: '2 hours', streak: 24, progress: 2, target: 2, unit: 'hours', icon: 'psychology' },
  { id: '4', title: 'Hydration', frequency: 'Daily', time: '3L Goal', streak: 5, progress: 1.8, target: 3.0, unit: 'L', icon: 'water_drop' },
];

const MOCK_GOALS: Goal[] = [
  { id: '1', title: 'Earn ₹50K/month', category: 'Financial Freedom', progress: 32000, target: 50000, unit: '₹', status: 'In Progress', nextMilestone: 'Secure 2 more freelance clients by end of month.', icon: 'CreditCard' },
  { id: '2', title: 'Learn Piano', category: 'Skill Level', progress: 35, target: 100, unit: '%', status: 'Active', nextMilestone: '4 practice sessions this week', icon: 'Music' },
  { id: '3', title: 'Run 5km Non-stop', category: 'Current Max', progress: 3.2, target: 5.0, unit: 'km', status: 'Active', nextMilestone: '+0.5km from last week', icon: 'fitness_center' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', merchant: 'The Alchemist Bar', category: 'Dining', amount: -124.00, time: '2h ago', type: 'expense', icon: 'restaurant' },
  { id: '2', merchant: 'Stripe Payout', category: 'Income', amount: 4250.00, time: 'Yesterday', type: 'income', icon: 'work' },
  { id: '3', merchant: 'Public Utility Corp', category: 'Bills', amount: -89.50, time: 'Aug 14', type: 'expense', icon: 'Zap' },
];

// Components
const BottomNav = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'ai', label: 'AI', icon: Bot },
    { id: 'finance', label: 'Money', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-surface/60 backdrop-blur-xl rounded-t-[3rem] shadow-[0_20px_40px_0_rgba(229,226,225,0.04)]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={`flex flex-col items-center justify-center p-3 transition-all duration-300 ease-out ${
              isActive 
                ? 'bg-primary text-on-primary rounded-full scale-110 shadow-[0_0_20px_rgba(77,166,255,0.3)]' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            {!isActive && <span className="font-inter text-[0.6875rem] font-semibold uppercase tracking-wider mt-1">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};

const TopBar = ({ title, userImage }: { title: string, userImage?: string }) => (
  <header className="bg-surface sticky top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20">
        <img 
          src={userImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuDj-iAgC_T1e_GkAni5Xa9GBj4eoBiuznpmXQhzzvbXA-zu8npRTZYgy2m2GkiqcGTpg7Czmy9PyvopDVS4yqF1tskx214d7fhrtbomJi5sYOoZTT5fYntiPoWYfD6XK2LxXHYygeca1YQyv7LB6OfRfa3iuvg7Xdu28W-N9tBaNmKm-Lbi8bnYRJlQO4B_Bhqs_2t0M3lL3jyrxasHu8ipweRmGO5SrkWs5b7w_8zQALLn0x68Jliy-eM-1EStWcbW8IZZ46t72Yw"} 
          alt="User Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
      <span className="font-headline font-bold tracking-tight text-[1.75rem] text-on-surface">{title}</span>
    </div>
    <div className="flex items-center gap-4">
      <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors duration-200 text-on-surface-variant">
        <Search size={20} />
      </button>
      <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors duration-200 text-on-surface-variant">
        <Bell size={20} />
      </button>
    </div>
  </header>
);

const Dashboard = ({ setScreen, tasks, habits, transactions, userProfile }: { 
  setScreen: (s: Screen) => void, 
  tasks: Task[], 
  habits: Habit[], 
  transactions: Transaction[],
  userProfile: any
}) => {
  const activeTasks = tasks.filter(t => !t.completed);
  const activeHabits = habits.filter(h => h.progress < h.target);
  const recentTransactions = transactions.slice(0, 3);

  return (
    <main className="pt-4 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <section className="mb-10">
        <h1 className="font-headline font-bold text-5xl md:text-6xl tracking-tight leading-tight mb-2">
          Good Morning,<br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-container">{userProfile?.displayName?.split(' ')[0] || "User"}</span>
        </h1>
        <p className="text-on-surface-variant font-medium text-lg">Your day is {Math.round((tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100)}% complete. {activeTasks.length} priorities left.</p>
      </section>

    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-7 bg-surface-container-low rounded-lg p-8 relative overflow-hidden group shadow-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline font-semibold text-xl text-on-surface">Priority Focus</h2>
          <button onClick={() => setScreen('tasks')} className="text-label-sm font-semibold uppercase tracking-wider text-primary">View All</button>
        </div>
        <div className="space-y-4">
          {tasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center p-4 bg-surface-container rounded-lg group-hover:bg-surface-container-high transition-colors shadow-sm">
              <CheckCircle2 className={`mr-4 ${task.completed ? 'text-primary' : 'text-outline'}`} size={24} />
              <div className="flex-1">
                <p className="text-on-surface font-medium">{task.title}</p>
                <p className="text-on-surface-variant text-xs uppercase tracking-widest mt-1">{task.category} • {task.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-5 bg-surface-container-low rounded-lg p-8 flex flex-col items-center justify-center text-center shadow-card">
        <h2 className="font-headline font-semibold text-xl text-on-surface mb-8 w-full text-left">Daily Vitality</h2>
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle className="text-surface-container-highest" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"></circle>
            <circle className="text-primary" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="553" strokeDashoffset="110" strokeWidth="12"></circle>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-headline font-bold text-5xl">82</span>
            <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Efficiency</span>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          <div className="bg-surface-container p-3 rounded-lg shadow-sm">
            <p className="text-xs text-on-surface-variant uppercase mb-1">Sleep</p>
            <p className="font-bold text-on-surface">7h 42m</p>
          </div>
          <div className="bg-surface-container p-3 rounded-lg shadow-sm">
            <p className="text-xs text-on-surface-variant uppercase mb-1">Focus</p>
            <p className="font-bold text-on-surface">4.2h</p>
          </div>
        </div>
      </div>

      <div className="md:col-span-12 bg-surface-container-low rounded-lg p-8 shadow-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="font-headline font-semibold text-xl text-on-surface">Financial Pulse</h2>
            <p className="text-on-surface-variant text-sm mt-1">Monthly performance overview</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-surface-container-highest"></span>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Spent</span>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between h-48 gap-3 md:gap-6">
          {[60, 45, 80, 30, 70, 20, 10].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full">
              <div className="w-full bg-primary rounded-t-lg" style={{ height: `${h}%` }}></div>
              <div className="w-full bg-surface-container-highest rounded-b-lg" style={{ height: `${Math.max(10, 100-h-20)}%` }}></div>
              <p className="text-[10px] text-center mt-2 font-bold text-on-surface-variant uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-12 relative overflow-hidden bg-surface-container-low rounded-lg p-1">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary-container/10 to-transparent blur-3xl -z-10"></div>
        <div className="bg-surface-container-low/60 backdrop-blur-xl p-8 rounded-[0.85rem] flex flex-col md:flex-row items-center gap-8 border border-outline-variant/10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary-container flex items-center justify-center shadow-[0_0_20px_rgba(77,166,255,0.3)]">
            <Bot className="text-on-primary" size={32} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-2">AI Insights</h3>
            <p className="text-on-surface-variant text-lg">"{userProfile?.displayName?.split(' ')[0] || "User"}, shifting your deep work block to 9:00 AM instead of 11:00 AM could increase your focus score by 15% based on last week's peaks."</p>
          </div>
          <button className="bg-primary text-on-primary font-bold px-8 py-4 rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20">
            Apply Suggestion
          </button>
        </div>
      </div>
    </div>
  </main>
  );
};

const TasksScreen = ({ tasks }: { tasks: Task[] }) => {
  const [filter, setFilter] = useState<'all' | 'work' | 'personal'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');

  const priorityMap = { high: 3, medium: 2, low: 1 };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return priorityMap[b.priority] - priorityMap[a.priority];
    } else {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });

  const filteredTasks = sortedTasks.filter(t => 
    filter === 'all' ? true : t.category?.toLowerCase() === filter
  );

  return (
  <main className="px-6 pt-8 pb-32 max-w-2xl mx-auto">
    <div className="relative mb-12">
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-secondary-container opacity-10 blur-[80px] pointer-events-none"></div>
      <h1 className="font-headline text-4xl text-primary tracking-tight leading-none mb-2">Today's Tasks</h1>
      <p className="text-on-surface-variant font-body">You have {tasks.filter(t => !t.completed).length} items demanding attention.</p>
    </div>

    <div className="flex flex-wrap gap-4 mb-8">
      <div className="flex bg-surface-container-low p-1 rounded-full shadow-sm border border-outline-variant/10">
        {(['all', 'work', 'personal'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              filter === f ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      
      <div className="flex bg-surface-container-low p-1 rounded-full shadow-sm border border-outline-variant/10">
        {(['priority', 'dueDate'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              sortBy === s ? 'bg-secondary text-on-secondary shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sort by {s === 'dueDate' ? 'Due Date' : 'Priority'}
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
      {filteredTasks.map(task => (
        <div key={task.id} className="p-6 rounded-xl bg-surface-container-low border-none flex justify-between items-center group cursor-pointer hover:bg-surface-container-high transition-colors shadow-card">
          <div className="flex items-center gap-4">
            <div className={`w-1.5 h-12 rounded-full ${task.priority === 'high' ? 'bg-error' : task.priority === 'medium' ? 'bg-tertiary' : 'bg-primary'}`}></div>
            <div>
              <span className={`font-label text-xs uppercase tracking-wider mb-1 block ${task.priority === 'high' ? 'text-error' : task.priority === 'medium' ? 'text-tertiary' : 'text-primary'}`}>{task.priority} Priority</span>
              <h3 className={`font-body text-xl text-on-surface ${task.completed ? 'line-through opacity-50' : ''}`}>{task.title}</h3>
              {task.dueDate && (
                <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant">
                  <CalendarClock size={12} />
                  <span className="text-[0.6875rem] font-medium">Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
          <div className={`w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center transition-all shadow-sm ${task.completed ? 'bg-primary text-on-primary' : 'group-hover:bg-primary/10'}`}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      ))}
    </div>

    <section className="mb-12">
      <div className="flex justify-between items-end mb-6">
        <h2 className="font-headline text-2xl text-on-surface">Upcoming</h2>
        <button className="font-label text-xs text-primary hover:underline uppercase">View Calendar</button>
      </div>
      <div className="space-y-4">
        {[
          { date: '14', month: 'Oct', title: 'Digital Concierge UX Workshop', time: '09:00 AM • Remote' },
          { date: '15', month: 'Oct', title: 'Client Presentation: LifeOS V2', time: '02:30 PM • Main Studio' }
        ].map((event, i) => (
          <div key={i} className="flex items-center gap-6 p-4 bg-surface-container-lowest rounded-lg group">
            <div className="text-center min-w-[48px]">
              <span className="block font-label text-xs text-on-surface-variant uppercase">{event.month}</span>
              <span className="block font-headline text-xl text-on-surface">{event.date}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-body font-medium text-on-surface">{event.title}</h4>
              <p className="text-on-surface-variant text-sm">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  </main>
  );
};

const HabitsScreen = ({ habits }: { habits: Habit[] }) => {
  const [activeTab, setActiveTab] = useState('Daily');
  const filteredHabits = habits.filter(h => h.frequency === activeTab);

  return (
  <main className="px-6 pt-4 pb-32 max-w-5xl mx-auto">
    <section className="mb-10 mt-4">
      <div className="flex justify-between items-end">
        <div>
          <span className="font-label text-on-surface-variant text-[0.6875rem] font-semibold uppercase tracking-wider mb-2 block">Personal Growth</span>
          <h2 className="font-headline text-5xl font-bold tracking-tight leading-none">My Habits</h2>
        </div>
      </div>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
      <div className="md:col-span-8 bg-surface-container-low rounded-xl p-8 relative overflow-hidden shadow-card">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-headline text-2xl font-semibold">Weekly Consistency</h3>
          <span className="text-primary text-sm font-semibold">84% Success Rate</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
            <div key={day} className="flex flex-col items-center gap-3">
              <span className="font-label text-[0.6875rem] text-on-surface-variant">{day}</span>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${i < 3 ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(77,166,255,0.4)]' : 'bg-surface-container-high border border-outline-variant/20 text-on-surface-variant'}`}>
                {i < 3 ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-4 bg-primary-container/10 rounded-xl p-8 border border-primary-container/20 flex flex-col justify-between shadow-card">
        <div>
          <div className="text-primary text-[2.5rem] font-bold leading-none mb-1">12</div>
          <div className="font-label text-on-surface-variant uppercase tracking-widest text-[0.6875rem]">Day Streak</div>
        </div>
        <div className="pt-4 border-t border-outline-variant/10">
          <p className="text-on-surface text-sm">You're in the top 5% of LifeOS users this week.</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredHabits.map(habit => (
        <div key={habit.id} className="bg-surface-container-high rounded-xl p-6 transition-all duration-300 hover:translate-y-[-4px] group shadow-card">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shadow-sm">
                {habit.icon === 'fitness_center' && <Activity size={24} />}
                {habit.icon === 'menu_book' && <BookOpen size={24} />}
                {habit.icon === 'psychology' && <Brain size={24} />}
                {habit.icon === 'water_drop' && <Droplets size={24} />}
              </div>
              <div>
                <h4 className="text-xl font-bold">{habit.title}</h4>
                <span className="text-on-surface-variant text-xs">{habit.frequency} • {habit.time}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-tertiary">
              <span className="font-bold">{habit.streak}</span>
              <Bolt size={16} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-on-surface-variant">Progress</span>
              <span className="text-on-surface">{habit.progress}/{habit.target} {habit.unit}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(habit.progress / habit.target) * 100}%` }}></div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button className="flex-1 bg-surface-container-lowest py-3 rounded-lg text-sm font-semibold group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300 shadow-sm">
              {habit.progress >= habit.target ? 'Done for Today' : 'Check In'}
            </button>
          </div>
        </div>
      ))}
    </div>
  </main>
  );
};

const FinanceScreen = ({ transactions }: { transactions: Transaction[] }) => {
  const [activeTab, setActiveTab] = useState('All');
  const totalBalance = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlySpending = Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0));

  return (
  <main className="px-6 pt-4 pb-32 max-w-4xl mx-auto relative">
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none -z-10"></div>
    <section className="mb-10">
      <span className="font-label text-xs uppercase tracking-widest text-primary mb-2 block">Dashboard</span>
      <h2 className="font-headline text-5xl font-bold leading-none tracking-tight">Financial Health</h2>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <div className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-between min-h-[180px] hover:bg-surface-container transition-colors duration-300 shadow-card">
        <div className="flex justify-between items-start">
          <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">Total Balance</span>
          <Wallet className="text-primary" size={24} />
        </div>
        <div>
          <p className="text-[2.5rem] font-headline font-bold text-on-surface">${totalBalance.toLocaleString()}</p>
          <p className="text-on-surface-variant font-medium flex items-center gap-1">
            <TrendingUp className="text-tertiary" size={16} />
            +2.4% from last month
          </p>
        </div>
      </div>
      <div className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-between min-h-[180px] hover:bg-surface-container transition-colors duration-300 shadow-card">
        <div className="flex justify-between items-start">
          <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">Spent This Month</span>
          <ShoppingCart className="text-secondary" size={24} />
        </div>
        <div>
          <p className="text-[2.5rem] font-headline font-bold text-on-surface">${monthlySpending.toLocaleString()}</p>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-3 overflow-hidden shadow-inner">
            <div className="bg-primary h-full w-[65%] rounded-full"></div>
          </div>
          <p className="text-on-surface-variant text-xs mt-2 uppercase tracking-tighter">65% of monthly budget</p>
        </div>
      </div>
    </div>

    <section className="bg-surface-container-low rounded-xl p-8 mb-10 shadow-card">
      <div className="flex justify-between items-center mb-10">
        <h3 className="font-headline text-xl font-semibold">Monthly Trend</h3>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-semibold text-on-surface-variant">Yearly</span>
          <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-xs font-semibold">Monthly</span>
        </div>
      </div>
      <div className="flex items-end justify-between h-48 gap-2">
        {[40, 55, 45, 70, 90, 60].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className={`w-full rounded-t-lg transition-all ${i === 4 ? 'bg-primary shadow-[0_0_20px_rgba(77,166,255,0.2)]' : 'bg-surface-container-highest group-hover:bg-primary-container/40'}`} style={{ height: `${h}%` }}></div>
            <span className={`text-[10px] uppercase font-bold ${i === 4 ? 'text-primary' : 'text-on-surface-variant'}`}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</span>
          </div>
        ))}
      </div>
    </section>

    <section className="mb-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline text-xl font-semibold">Recent Transactions</h3>
        <button className="text-primary font-semibold text-sm">View All</button>
      </div>
      <div className="space-y-4">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                {tx.category === 'Dining' && <Utensils className="text-primary" size={20} />}
                {tx.category === 'Income' && <TrendingUp className="text-tertiary" size={20} />}
                {tx.category === 'Bills' && <Zap className="text-secondary" size={20} />}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{tx.merchant}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-tighter">{tx.category} • {tx.time}</p>
              </div>
            </div>
            <p className={`font-bold ${tx.type === 'income' ? 'text-primary' : 'text-on-surface'}`}>
              {tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </section>
  </main>
  );
};

const AIScreen = ({ messages }: { messages: any[] }) => {
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState(messages);

  useEffect(() => {
    setChatMessages(messages);
  }, [messages]);

  return (
    <main className="flex-1 overflow-y-auto px-6 pt-4 pb-48 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none"></div>
      <div className="max-w-3xl mx-auto flex flex-col gap-8 relative z-10">
        <div className="flex justify-center">
          <span className="font-label text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-4 py-1.5 rounded-full">Today, Oct 24</span>
        </div>

        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-4`}>
            {msg.role === 'ai' && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-sm">
                  <Bot className="text-on-primary-container" size={18} />
                </div>
                <span className="font-label text-[0.75rem] font-bold text-primary-fixed-dim uppercase tracking-widest">Insights Engine</span>
              </div>
            )}
            <div className={`max-w-[90%] flex flex-col gap-4`}>
              <div className={`px-6 py-4 rounded-xl shadow-card ${msg.role === 'user' ? 'bg-surface-container-high text-on-surface rounded-tr-none' : 'bg-surface-container-low border border-outline-variant/20 rounded-tl-none'}`}>
                <p className="body-md leading-relaxed">{msg.text}</p>
                {msg.insights && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 shadow-sm">
                      <span className="text-[0.625rem] text-on-surface-variant block mb-1 uppercase font-bold">Potential Savings</span>
                      <span className="text-xl font-bold text-primary">$85.00/wk</span>
                    </div>
                    <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/10 shadow-sm">
                      <span className="text-[0.625rem] text-on-surface-variant block mb-1 uppercase font-bold">Vacation Goal</span>
                      <span className="text-xl font-bold text-on-surface">12% Reach</span>
                    </div>
                  </div>
                )}
              </div>
              <span className={`font-label text-[0.6rem] text-on-surface-variant ${msg.role === 'user' ? 'text-right px-2' : 'px-2'}`}>{msg.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-24 left-0 w-full px-6 z-30">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {['Plan my day', 'Save money', 'Build routine'].map(chip => (
              <button key={chip} className="whitespace-nowrap bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-full font-label text-[0.75rem] font-semibold border border-outline-variant/10 transition-all active:scale-95">
                {chip}
              </button>
            ))}
          </div>
          <div className="bg-surface-container-low/60 backdrop-blur-xl rounded-full p-2 flex items-center gap-2 border border-outline-variant/20 shadow-2xl">
            <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
              <PlusCircle size={24} />
            </button>
            <input className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder-on-surface-variant/50 font-body py-2" placeholder="Message Insights Engine..." type="text" />
            <button className="w-10 h-10 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-lg shadow-primary-container/20 active:scale-90 transition-all">
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

const ProfileScreen = ({ theme, setTheme, userProfile }: { theme: string, setTheme: (t: string) => void, userProfile: any }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const themes = [
    { id: 'dark', name: 'Midnight', color: '#131313' },
    { id: 'light', name: 'Snow', color: '#f7f7f7' },
    { id: 'ocean', name: 'Ocean', color: '#0a192f' },
    { id: 'forest', name: 'Forest', color: '#1a2e1a' },
    { id: 'sunset', name: 'Sunset', color: '#2d1b1b' },
    { id: 'lavender', name: 'Lavender', color: '#1b142d' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: '#000000' },
    { id: 'nord', name: 'Nord', color: '#2e3440' },
    { id: 'sepia', name: 'Sepia', color: '#f4ecd8' },
    { id: 'rose', name: 'Rose', color: '#fff0f5' },
  ];

  const preferences = [
    { id: 'appearance', icon: Palette, label: 'Appearance', sub: 'Dark mode, accent colors' },
    { id: 'notifications', icon: Bell, label: 'Notifications', sub: 'Smart alerts and focus mode' },
    { id: 'security', icon: Shield, label: 'Security', sub: 'Biometrics and 2FA' },
    { id: 'app_prefs', icon: Settings, label: 'App Preferences', sub: 'Language, region, units' }
  ];

  const renderModalContent = () => {
    switch (activeModal) {
      case 'manage_plan':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-primary-container/10 rounded-xl border border-primary-container/20">
              <Zap className="text-primary" size={32} />
              <div>
                <h4 className="font-headline font-bold text-lg">LifeOS Ultra</h4>
                <p className="text-sm text-on-surface-variant">Active since Oct 12, 2023</p>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Plan Benefits</h5>
              <ul className="space-y-2">
                {['Unlimited AI Insights', 'Cross-device Sync', 'Priority Support', 'Custom Themes'].map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold shadow-lg">Upgrade to Family</button>
              <button className="w-full py-4 bg-surface-container-high text-error rounded-xl font-bold">Cancel Subscription</button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Display Mode</h5>
              <div className="grid grid-cols-2 gap-4">
                {['System', 'Always Dark'].map(m => (
                  <button key={m} className={`p-4 rounded-xl border ${m === 'Always Dark' ? 'border-primary bg-primary/10' : 'border-outline-variant/20'} text-sm font-bold`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Animation Speed</h5>
              <input type="range" className="w-full accent-primary" />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
              <Settings size={32} />
            </div>
            <div>
              <h4 className="font-headline font-bold text-xl">Coming Soon</h4>
              <p className="text-on-surface-variant max-w-[200px] mx-auto">We're working on bringing more control to your LifeOS experience.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="px-6 mt-8 pb-32 max-w-2xl mx-auto space-y-12">
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-xl bg-surface-container-low p-1 ring-1 ring-outline-variant/20 overflow-hidden shadow-card">
            <img 
              src={userProfile?.photoURL || "https://picsum.photos/seed/user/200/200"} 
              alt={userProfile?.displayName || "User"} 
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary-container text-on-primary-container text-[0.6875rem] font-bold px-3 py-1 rounded-full shadow-lg uppercase">
            {userProfile?.plan || "PREMIUM"}
          </div>
        </div>
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">{userProfile?.displayName || "User"}</h2>
          <p className="text-on-surface-variant font-body mt-1">{userProfile?.email || ""}</p>
        </div>
        <button 
          onClick={() => logOut()}
          className="flex items-center gap-2 px-6 py-2 bg-error/10 text-error rounded-full font-bold text-sm hover:bg-error/20 transition-colors"
        >
          <LogOut size={16} /> Log Out
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between aspect-video md:aspect-square relative overflow-hidden group shadow-card">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <LineChart size={80} />
          </div>
          <div>
            <span className="font-label text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">Productivity Score</span>
            <div className="font-headline text-5xl font-bold mt-2 tracking-tighter">94<span className="text-xl text-on-surface-variant">/100</span></div>
          </div>
          <p className="text-sm text-on-surface-variant max-w-[180px]">You're in the top 2% of focus achievers this week.</p>
        </div>
        <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between aspect-video md:aspect-square text-on-primary-container shadow-card">
          <div>
            <span className="font-label text-[0.6875rem] font-semibold uppercase tracking-wider opacity-80">Active Plan</span>
            <h3 className="font-headline text-3xl font-bold mt-2 leading-none">LifeOS Ultra</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium">Renews on Oct 12, 2024</p>
            <button 
              onClick={() => setActiveModal('manage_plan')}
              className="w-full py-3 bg-on-primary text-primary-container rounded-lg font-bold text-sm active:scale-95 transition-all shadow-md"
            >
              Manage Plan
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="font-label text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant px-2">Theme Selection</h4>
        <div className="grid grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                theme === t.id ? 'bg-primary-container/20 ring-2 ring-primary' : 'hover:bg-surface-container-low'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-full border border-outline-variant/20 shadow-sm"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-[0.6rem] font-bold uppercase tracking-tighter text-on-surface-variant group-hover:text-on-surface">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-label text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant px-2 mb-4">Preferences</h4>
        <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-card">
          {preferences.map((item, i) => (
            <div 
              key={i} 
              onClick={() => setActiveModal(item.id)}
              className="flex items-center justify-between p-5 hover:bg-surface-container-high transition-colors cursor-pointer group border-b border-outline-variant/10 last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="font-body text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-on-surface-variant">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-on-surface-variant" />
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4">
        <button 
          onClick={() => logOut()}
          className="w-full flex items-center justify-center gap-2 p-5 bg-surface-container-low hover:bg-error/10 text-error rounded-xl transition-colors font-semibold shadow-card"
        >
          <LogOut size={20} />
          Log Out
        </button>
        <p className="text-center text-[0.6875rem] text-on-surface-variant mt-8 uppercase tracking-widest font-semibold opacity-50">LifeOS v2.4.0 • Build 8921</p>
      </section>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-surface-container-low rounded-t-3xl md:rounded-3xl p-8 shadow-2xl border-t md:border border-outline-variant/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-headline font-bold text-2xl capitalize">
                  {activeModal.replace('_', ' ')}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              {renderModalContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

const Onboarding = ({ onFinish }: { onFinish: () => void }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Master Your Finances.",
      desc: "Automatically track spending and save more with smart insights.",
      content: (
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-surface-container-low p-8 rounded-xl relative overflow-hidden group shadow-card">
            <div className="absolute top-0 right-0 p-6">
              <TrendingUp className="text-primary opacity-40" size={32} />
            </div>
            <div className="relative z-10">
              <span className="font-label text-on-surface-variant tracking-[0.15em] uppercase text-[0.6875rem] font-semibold">Savings Velocity</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[2.5rem] font-headline font-bold text-on-surface tracking-tighter">$4,280</span>
                <span className="text-primary text-sm font-semibold">+12%</span>
              </div>
              <div className="mt-4 flex gap-1">
                <div className="h-1.5 w-12 rounded-full bg-primary shadow-sm"></div>
                <div className="h-1.5 w-8 rounded-full bg-primary/40 shadow-sm"></div>
                <div className="h-1.5 w-4 rounded-full bg-primary/20 shadow-sm"></div>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-high p-6 rounded-xl flex flex-col items-center justify-center aspect-square shadow-card">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container-highest" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="text-primary" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="62.8" strokeWidth="8"></circle>
              </svg>
              <span className="text-xl font-bold font-headline">75%</span>
            </div>
            <span className="font-label text-on-surface-variant tracking-wider uppercase text-[0.6rem] mt-4 font-bold text-center">Budget Used</span>
          </div>
          <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between shadow-card">
            <div>
              <span className="font-label text-on-surface-variant tracking-wider uppercase text-[0.6rem] font-bold">Top Category</span>
              <div className="mt-2 flex items-center gap-2">
                <Utensils className="text-tertiary" size={20} />
                <span className="font-bold text-on-surface text-sm">Dining</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-lg font-headline font-bold text-on-surface">$842.00</span>
              <div className="w-full bg-surface-container-highest h-1 rounded-full mt-1 shadow-inner">
                <div className="bg-tertiary h-full w-2/3 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      ),
      button: "Continue to Insights"
    },
    {
      title: "Smarter Daily Planning.",
      desc: "Our AI helps you prioritize what matters most.",
      content: (
        <div className="w-full relative space-y-3">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary-container" size={20} />
              <span className="text-lg font-headline text-on-surface">AI Suggestion</span>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">WED, OCT 24</span>
          </div>
          <div className="bg-surface-container-high p-5 rounded-lg flex items-center justify-between shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-primary rounded-full shadow-sm"></div>
              <div>
                <p className="font-headline text-on-surface text-base">Deep Work: UI System</p>
                <p className="text-on-surface-variant text-xs mt-0.5">09:00 AM — 11:30 AM</p>
              </div>
            </div>
            <div className="bg-primary-container/10 px-2.5 py-1 rounded-full border border-primary-container/20 shadow-sm">
              <span className="text-[10px] font-bold text-primary-container uppercase tracking-wider">Priority</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-lg flex items-center justify-between opacity-80 scale-95 shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-secondary rounded-full shadow-sm"></div>
              <div>
                <p className="font-headline text-on-surface text-base">Client Review</p>
                <p className="text-on-surface-variant text-xs mt-0.5">01:00 PM — 02:00 PM</p>
              </div>
            </div>
            <TrendingUp size={18} className="text-on-surface-variant" />
          </div>
        </div>
      ),
      button: "Next"
    },
    {
      title: "Crush Your Goals.",
      desc: "Break down big dreams into small, manageable habits.",
      content: (
        <div className="w-full max-w-md grid grid-cols-6 gap-4 items-end">
          <div className="col-span-2 aspect-square bg-surface-container-low rounded-lg p-4 flex flex-col justify-between items-start shadow-card">
            <Bolt className="text-tertiary fill-tertiary" size={24} />
            <div>
              <p className="font-label text-on-surface-variant uppercase tracking-widest text-[0.6rem]">Streak</p>
              <p className="font-headline font-bold text-xl">14</p>
            </div>
          </div>
          <div className="col-span-4 bg-surface-container-high rounded-xl p-6 shadow-card relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start">
                <span className="font-label text-primary uppercase tracking-widest text-[0.7rem] font-bold">Quarterly Mission</span>
                <Flag className="text-primary-container/40" size={20} />
              </div>
              <h3 className="font-headline font-bold text-lg leading-tight">Master Computational Design</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[0.6875rem] font-semibold text-on-surface-variant">
                  <span>65% Complete</span>
                  <span>24 Days Left</span>
                </div>
                <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-[65%] bg-gradient-to-r from-primary to-primary-container rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      button: "Get Started"
    }
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 aurora-glow pointer-events-none"></div>
      
      <header className="absolute top-0 left-0 w-full flex justify-between items-center px-6 py-8 z-20">
        <div className="text-xl font-headline font-extrabold tracking-tighter text-primary">LifeOS</div>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-12 bg-primary-container shadow-[0_0_10px_rgba(77,166,255,0.4)]' : 'w-8 bg-surface-container-highest'}`}></div>
          ))}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-md mt-20">
        <div className="w-full mb-12">
          <h1 className="font-headline text-[3.5rem] leading-[1.1] font-bold tracking-tight mb-6">
            {current.title.split(' ').slice(0, -1).join(' ')} <br/>
            <span className="text-primary-fixed-dim">{current.title.split(' ').slice(-1)}</span>
          </h1>
          <p className="text-on-surface-variant text-[1.125rem] leading-relaxed max-w-[90%]">
            {current.desc}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            {current.content}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="w-full max-w-md pb-16 flex flex-col items-center gap-6">
        <button 
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onFinish()}
          className="w-full py-5 px-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-[0_10px_30px_rgba(77,166,255,0.2)] active:scale-95 transition-all duration-200"
        >
          {current.button}
        </button>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-on-surface-variant font-body font-semibold flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </button>
        )}
      </footer>
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setScreen('dashboard');
      } else {
        setScreen('onboarding');
        setIsInitialized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // User Profile
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

    // Tasks
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    // Habits
    const habitsRef = collection(db, 'habits');
    const habitsQuery = query(habitsRef, where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
      const habitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      setHabits(habitsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'habits'));

    // Transactions
    const transactionsRef = collection(db, 'transactions');
    const transactionsQuery = query(transactionsRef, where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transactionsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    // AI Messages
    const aiMessagesRef = collection(db, 'ai_messages');
    const aiMessagesQuery = query(aiMessagesRef, where('uid', '==', user.uid), orderBy('createdAt', 'asc'));
    const unsubAiMessages = onSnapshot(aiMessagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiMessages(messagesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'ai_messages'));

    return () => {
      unsubUser();
      unsubTasks();
      unsubHabits();
      unsubTransactions();
      unsubAiMessages();
    };
  }, [user]);

  const handleOnboardingFinish = async () => {
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        // Create user doc if it doesn't exist
        const userDocRef = doc(db, 'users', loggedInUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: loggedInUser.uid,
            displayName: loggedInUser.displayName,
            email: loggedInUser.email,
            photoURL: loggedInUser.photoURL,
            plan: 'LifeOS Ultra',
            createdAt: serverTimestamp(),
            theme: 'dark'
          });
        }
        setScreen('dashboard');
      }
    } catch (error) {
      console.error("Onboarding error:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="aurora-glow absolute inset-0 opacity-20"></div>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Bot className="text-primary" size={64} />
          <p className="font-label uppercase tracking-widest text-xs font-bold text-on-surface-variant">Initializing LifeOS...</p>
        </div>
      </div>
    );
  }

  if (!user && !isInitialized && screen === 'onboarding') {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 aurora-glow pointer-events-none"></div>
        <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-8 text-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary-container/20 blur-3xl rounded-full"></div>
            <div className="relative flex items-center justify-center w-32 h-32 rounded-xl bg-surface-container-high shadow-2xl border border-outline-variant/20">
              <Bot className="text-primary-container" size={64} fill="currentColor" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="font-headline font-bold text-5xl tracking-tighter text-on-surface">LifeOS</h1>
            <p className="font-body text-on-surface-variant text-lg tracking-wide max-w-xs mx-auto opacity-80">Control Your Life with AI</p>
          </div>
          <div className="mt-24 flex flex-col items-center gap-6">
            <button 
              onClick={() => setIsInitialized(true)}
              className="group relative px-8 py-4 bg-surface-container-low hover:bg-surface-container-high transition-all duration-300 rounded-full border border-outline-variant/10 flex items-center gap-3"
            >
              <span className="font-label uppercase tracking-widest text-[0.6875rem] font-semibold text-on-surface-variant group-hover:text-primary transition-colors">Initializing Core</span>
              <ArrowRight className="text-primary transition-transform group-hover:translate-x-1" size={16} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user && isInitialized) {
    return <Onboarding onFinish={handleOnboardingFinish} />;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding': return <Onboarding onFinish={handleOnboardingFinish} />;
      case 'dashboard': return <Dashboard setScreen={setScreen} tasks={tasks} habits={habits} transactions={transactions} userProfile={userProfile} />;
      case 'tasks': return <TasksScreen tasks={tasks} />;
      case 'habits': return <HabitsScreen habits={habits} />;
      case 'finance': return <FinanceScreen transactions={transactions} />;
      case 'ai': return <AIScreen messages={aiMessages} />;
      case 'profile': return <ProfileScreen theme={theme} setTheme={setTheme} userProfile={userProfile} />;
      default: return <Dashboard setScreen={setScreen} tasks={tasks} habits={habits} transactions={transactions} userProfile={userProfile} />;
    }
  };

  const showNav = screen !== 'onboarding';
  const screenTitles: Record<string, string> = {
    dashboard: 'LifeOS',
    tasks: 'Tasks',
    habits: 'Habits',
    finance: 'Finance',
    ai: 'AI Assistant',
    profile: 'Profile'
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface">
        {showNav && <TopBar title={screenTitles[screen] || 'LifeOS'} userImage={userProfile?.photoURL} />}
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
        {showNav && (
          <>
            <button className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_10px_20px_rgba(77,166,255,0.4)] flex items-center justify-center z-[60] active:scale-90 transition-transform">
              <Plus size={32} />
            </button>
            <BottomNav currentScreen={screen} setScreen={setScreen} />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
