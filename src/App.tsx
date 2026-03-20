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
  AlertCircle,
  Trash2,
  Send,
  Loader2,
  MessageSquare,
  History,
  Target,
  Calendar,
  Clock,
  Tag
} from 'lucide-react';
import { useState, useEffect, useCallback, ReactNode, Component, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Task, Habit, Goal, Transaction, AIMessage } from './types';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

// Components
const BottomNav = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'habits', label: 'Habits', icon: Zap },
    { id: 'goals', label: 'Goals', icon: Target },
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

const isNewCycle = (habit: Habit) => {
  if (!habit.lastUpdated) return false;
  const last = new Date(habit.lastUpdated);
  const now = new Date();
  if (habit.frequency === 'Daily') {
    return last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
  } else if (habit.frequency === 'Weekly') {
    const getMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff)).setHours(0,0,0,0);
    };
    return getMonday(now) !== getMonday(last);
  } else if (habit.frequency === 'Monthly') {
    return last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
  }
  return false;
};

const Dashboard = ({ setScreen, tasks, habits, goals, transactions, userProfile, productivityScore, currency }: { 
  setScreen: (s: Screen) => void, 
  tasks: Task[], 
  habits: Habit[], 
  goals: Goal[],
  transactions: Transaction[],
  userProfile: any,
  productivityScore: number,
  currency: string
}) => {
  const [insight, setInsight] = useState<string>('');
  const [isFetchingInsight, setIsFetchingInsight] = useState(false);

  const fetchInsight = async () => {
    setIsFetchingInsight(true);
    try {
      const prompt = `Analyze the following user data and provide ONE short, actionable, and highly specific suggestion (max 2 sentences) to improve their productivity, habits, goals, or financial health. Do not use markdown or formatting. Make it sound like a personal assistant talking to ${userProfile?.displayName?.split(' ')[0] || "User"}.
      
      To ensure variety, focus on a different aspect than before. Random seed: ${Math.random()}
      
      Tasks: ${JSON.stringify(tasks.slice(0, 5))}
      Habits: ${JSON.stringify(habits.slice(0, 5))}
      Goals: ${JSON.stringify(goals.slice(0, 3))}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 5))}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.9,
        }
      });

      setInsight(response.text || "Keep up the great work! You're on track with your goals.");
    } catch (error) {
      console.error("Failed to fetch insight:", error);
      setInsight("Keep up the great work! You're on track with your goals.");
    } finally {
      setIsFetchingInsight(false);
    }
  };

  useEffect(() => {
    if (!insight) {
      fetchInsight();
    }
  }, [tasks, habits, goals, transactions]);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const efficiency = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0));
  
  // Simple weekly financial data for the chart
  const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  transactions.forEach(tx => {
    const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
    const day = (date.getDay() + 6) % 7; // Adjust to Mon-Sun
    if (tx.type === 'income') weeklyData[day] += tx.amount;
    else weeklyData[day] -= tx.amount;
  });
  
  const maxAbs = Math.max(...weeklyData.map(Math.abs), 1);

  return (
    <main className="pt-4 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <section className="mb-10">
        <h1 className="font-headline font-bold text-5xl md:text-6xl tracking-tight leading-tight mb-2">
          Good Morning,<br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-container">{userProfile?.displayName?.split(' ')[0] || "User"}</span>
        </h1>
        <p className="text-on-surface-variant font-medium text-lg">Your day is {efficiency}% complete. {activeTasks.length} priorities left.</p>
      </section>

    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-4 bg-surface-container-low rounded-2xl p-8 relative overflow-hidden shadow-card border border-outline-variant/10">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <LineChart size={64} />
        </div>
        <span className="font-label text-primary tracking-[0.15em] uppercase text-[0.6875rem] font-bold">Productivity Score</span>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-6xl font-headline font-bold text-on-surface tracking-tighter">{productivityScore}</span>
          <span className="text-on-surface-variant text-xl font-medium">/100</span>
        </div>
        <p className="mt-8 text-on-surface-variant text-sm leading-relaxed">
          {productivityScore > 80 ? "You're in the top 2% of focus achievers this week." : 
           productivityScore > 50 ? "You're making steady progress. Keep it up!" : 
           "Time to focus. Start with a small task to build momentum."}
        </p>
      </div>

      <div className="md:col-span-8 bg-surface-container-low rounded-lg p-8 relative overflow-hidden group shadow-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline font-semibold text-xl text-on-surface">Priority Focus</h2>
          <button onClick={() => setScreen('tasks')} className="text-label-sm font-semibold uppercase tracking-wider text-primary">View All</button>
        </div>
        <div className="space-y-4">
          {tasks.length === 0 && <p className="text-on-surface-variant text-sm py-4">No tasks for today. Add some to stay focused!</p>}
          {tasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center p-4 bg-surface-container rounded-lg group-hover:bg-surface-container-high transition-colors shadow-sm">
              <CheckCircle2 className={`mr-4 ${task.completed ? 'text-primary' : 'text-outline'}`} size={24} />
              <div className="flex-1">
                <p className={`text-on-surface font-medium ${task.completed ? 'line-through opacity-50' : ''}`}>{task.title}</p>
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
            <circle 
              className="text-primary transition-all duration-1000" 
              cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" 
              strokeDasharray="553" 
              strokeDashoffset={553 - (553 * efficiency) / 100} 
              strokeWidth="12"
              strokeLinecap="round"
            ></circle>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-headline font-bold text-5xl">{efficiency}</span>
            <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">Efficiency</span>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          <div className="bg-surface-container p-3 rounded-lg shadow-sm">
            <p className="text-xs text-on-surface-variant uppercase mb-1">Habits</p>
            <p className="font-bold text-on-surface">{habits.filter(h => !isNewCycle(h) && h.progress > 0).length}/{habits.length}</p>
          </div>
          <div className="bg-surface-container p-3 rounded-lg shadow-sm">
            <p className="text-xs text-on-surface-variant uppercase mb-1">Tasks</p>
            <p className="font-bold text-on-surface">{completedTasks.length}/{tasks.length}</p>
          </div>
        </div>
      </div>

      <div className="md:col-span-7 bg-surface-container-low rounded-lg p-8 shadow-card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="font-headline font-semibold text-xl text-on-surface">Financial Pulse</h2>
            <p className="text-on-surface-variant text-sm mt-1">Weekly performance overview</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-surface-container-highest"></span>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">Expense</span>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between h-48 gap-3 md:gap-6">
          {weeklyData.map((val, i) => {
            const incomeHeight = val > 0 ? (val / maxAbs) * 100 : 0;
            const expenseHeight = val < 0 ? (Math.abs(val) / maxAbs) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full group relative">
                <div className="w-full bg-primary rounded-t-lg transition-all duration-500" style={{ height: `${incomeHeight}%` }}></div>
                <div className="w-full bg-surface-container-highest rounded-b-lg transition-all duration-500" style={{ height: `${expenseHeight}%` }}></div>
                <p className="text-[10px] text-center mt-2 font-bold text-on-surface-variant uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</p>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-high px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {currency}{Math.abs(val).toFixed(0)}
                </div>
              </div>
            );
          })}
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
            <p className="text-on-surface-variant text-lg">
              {isFetchingInsight ? (
                <span className="flex items-center gap-2 justify-center md:justify-start">
                  <Loader2 className="animate-spin" size={20} /> Analyzing your data...
                </span>
              ) : (
                `"${insight}"`
              )}
            </p>
          </div>
          <button 
            onClick={fetchInsight}
            disabled={isFetchingInsight}
            className="bg-primary text-on-primary font-bold px-8 py-4 rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            Apply Suggestion
          </button>
        </div>
      </div>
    </div>
  </main>
  );
};

const TasksScreen = ({ tasks, user }: { tasks: Task[], user: FirebaseUser | null }) => {
  const [filter, setFilter] = useState<'all' | 'work' | 'personal'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as const, category: 'Work', time: 'Morning' });

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

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTask.title) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        uid: user.uid,
        completed: false,
        createdAt: serverTimestamp(),
        dueDate: new Date().toISOString()
      });
      setNewTask({ title: '', priority: 'medium', category: 'Work', time: 'Morning' });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tasks');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  return (
  <main className="px-6 pt-8 pb-32 max-w-2xl mx-auto">
    <div className="relative mb-12 flex justify-between items-start">
      <div>
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-secondary-container opacity-10 blur-[80px] pointer-events-none"></div>
        <h1 className="font-headline text-4xl text-primary tracking-tight leading-none mb-2">Today's Tasks</h1>
        <p className="text-on-surface-variant font-body">You have {tasks.filter(t => !t.completed).length} items demanding attention.</p>
      </div>
      <button 
        onClick={() => setShowAdd(!showAdd)}
        className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
      >
        {showAdd ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={addTask}
        className="mb-10 p-6 bg-surface-container-low rounded-xl shadow-card space-y-4"
      >
        <input 
          type="text" 
          placeholder="What needs to be done?"
          className="w-full bg-surface-container-high border-none rounded-lg p-4 text-on-surface focus:ring-2 ring-primary"
          value={newTask.title}
          onChange={e => setNewTask({...newTask, title: e.target.value})}
        />
        <div className="flex gap-4">
          <select 
            className="flex-1 bg-surface-container-high border-none rounded-lg p-4 text-on-surface"
            value={newTask.priority}
            onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <select 
            className="flex-1 bg-surface-container-high border-none rounded-lg p-4 text-on-surface"
            value={newTask.category}
            onChange={e => setNewTask({...newTask, category: e.target.value})}
          >
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Health">Health</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
        <button type="submit" className="w-full py-4 bg-primary text-on-primary rounded-lg font-bold">Add Task</button>
      </motion.form>
    )}

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
      {filteredTasks.length === 0 && (
        <div className="col-span-full py-20 text-center opacity-50">
          <CheckCircle2 size={48} className="mx-auto mb-4" />
          <p>No tasks yet. Add one to get started!</p>
        </div>
      )}
      {filteredTasks.map(task => (
        <div key={task.id} className="p-6 rounded-xl bg-surface-container-low border-none flex justify-between items-center group cursor-pointer hover:bg-surface-container-high transition-colors shadow-card">
          <div className="flex items-center gap-4 flex-1" onClick={() => toggleTask(task)}>
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
          <div className="flex items-center gap-2">
            <button onClick={() => deleteTask(task.id)} className="p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={18} />
            </button>
            <div 
              onClick={() => toggleTask(task)}
              className={`w-10 h-10 rounded-full border border-outline-variant/20 flex items-center justify-center transition-all shadow-sm ${task.completed ? 'bg-primary text-on-primary' : 'group-hover:bg-primary/10'}`}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </main>
  );
};

const HabitsScreen = ({ habits, user }: { habits: Habit[], user: FirebaseUser | null }) => {
  const [activeTab, setActiveTab] = useState('Daily');
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ title: '', frequency: 'Daily', target: 1, unit: 'times', icon: 'zap' });
  
  const filteredHabits = habits.filter(h => h.frequency === activeTab);

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newHabit.title) return;
    try {
      await addDoc(collection(db, 'habits'), {
        ...newHabit,
        uid: user.uid,
        streak: 0,
        progress: 0,
        createdAt: serverTimestamp()
      });
      setNewHabit({ title: '', frequency: 'Daily', target: 1, unit: 'times', icon: 'zap' });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'habits');
    }
  };

  const checkIn = async (habit: Habit) => {
    try {
      const reset = isNewCycle(habit);
      const currentProgress = reset ? 0 : habit.progress;
      
      if (currentProgress >= habit.target) return;
      
      const newProgress = currentProgress + 1;
      const updates: any = { 
        progress: newProgress,
        lastUpdated: new Date().toISOString()
      };
      
      if (newProgress === habit.target) {
        updates.streak = habit.streak + 1;
      }
      
      await updateDoc(doc(db, 'habits', habit.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `habits/${habit.id}`);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'habits', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `habits/${id}`);
    }
  };

  return (
  <main className="px-6 pt-4 pb-32 max-w-5xl mx-auto">
    <section className="mb-10 mt-4 flex justify-between items-end">
      <div>
        <span className="font-label text-on-surface-variant text-[0.6875rem] font-semibold uppercase tracking-wider mb-2 block">Personal Growth</span>
        <h2 className="font-headline text-5xl font-bold tracking-tight leading-none">My Habits</h2>
      </div>
      <button 
        onClick={() => setShowAdd(!showAdd)}
        className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
      >
        {showAdd ? <X size={24} /> : <Plus size={24} />}
      </button>
    </section>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={addHabit}
        className="mb-10 p-8 bg-surface-container-low rounded-2xl shadow-card space-y-6 border border-outline-variant/10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Habit Name</label>
            <input 
              type="text" 
              placeholder="e.g. Morning Meditation"
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              value={newHabit.title}
              onChange={e => setNewHabit({...newHabit, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Frequency</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
              value={newHabit.frequency}
              onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-24 bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
                value={newHabit.target}
                onChange={e => setNewHabit({...newHabit, target: parseInt(e.target.value) || 1})}
              />
              <input 
                type="text" 
                placeholder="times"
                className="flex-1 bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
                value={newHabit.unit}
                onChange={e => setNewHabit({...newHabit, unit: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Icon</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
              value={newHabit.icon}
              onChange={e => setNewHabit({...newHabit, icon: e.target.value})}
            >
              <option value="zap">Zap</option>
              <option value="droplets">Water</option>
              <option value="book-open">Read</option>
              <option value="brain">Focus</option>
              <option value="activity">Exercise</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20">Create Habit</button>
      </motion.form>
    )}

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
          <div className="text-primary text-[2.5rem] font-bold leading-none mb-1">{habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0}</div>
          <div className="font-label text-on-surface-variant uppercase tracking-widest text-[0.6875rem]">Max Streak</div>
        </div>
        <div className="mt-4">
          <p className="text-on-surface-variant text-sm leading-relaxed">Keep building your habits to increase your streak!</p>
        </div>
      </div>
    </div>

    <div className="flex gap-8 border-b border-outline-variant/20 mb-8">
      {['Daily', 'Weekly', 'Monthly'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          {tab}
          {activeTab === tab && <motion.div layoutId="habitTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredHabits.length === 0 && (
        <div className="col-span-full py-20 text-center opacity-50">
          <Zap size={48} className="mx-auto mb-4" />
          <p>No {activeTab.toLowerCase()} habits yet. Add one to build your routine!</p>
        </div>
      )}
      {filteredHabits.map((habit) => {
        const reset = isNewCycle(habit);
        const displayProgress = reset ? 0 : habit.progress;
        const isCompleted = displayProgress >= habit.target;

        return (
        <div key={habit.id} className="bg-surface-container-low rounded-xl p-6 border-none shadow-card group relative">
          <button 
            onClick={() => deleteHabit(habit.id)}
            className="absolute top-4 right-4 p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {habit.icon === 'zap' && <Zap size={24} />}
              {habit.icon === 'droplets' && <Droplets size={24} />}
              {habit.icon === 'book-open' && <BookOpen size={24} />}
              {habit.icon === 'brain' && <Brain size={24} />}
              {habit.icon === 'activity' && <Activity size={24} />}
            </div>
            <div>
              <h4 className="font-body text-lg font-semibold text-on-surface">{habit.title}</h4>
              <span className="text-primary text-xs font-bold uppercase tracking-wider">{habit.streak} {habit.frequency === 'Daily' ? 'Day' : habit.frequency === 'Weekly' ? 'Week' : 'Month'} Streak</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              <span>Progress</span>
              <span>{displayProgress}/{habit.target} {habit.unit}</span>
            </div>
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((displayProgress / habit.target) * 100, 100)}%` }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(77,166,255,0.5)]"
              />
            </div>
            <button 
              onClick={() => checkIn(habit)}
              disabled={isCompleted}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all active:scale-95 ${isCompleted ? 'bg-primary text-on-primary opacity-50 cursor-not-allowed' : 'bg-surface-container-high hover:bg-primary hover:text-on-primary'}`}
            >
              {isCompleted ? 'Completed' : 'Check In'}
            </button>
          </div>
        </div>
      )})}
    </div>
  </main>
  );
};

const GoalsScreen = ({ goals, user }: { goals: Goal[], user: FirebaseUser | null }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', category: '', target: 100, unit: '%', icon: 'Target' });

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.title) return;
    try {
      await addDoc(collection(db, 'goals'), {
        ...newGoal,
        uid: user.uid,
        progress: 0,
        status: 'Active',
        createdAt: serverTimestamp()
      });
      setNewGoal({ title: '', category: '', target: 100, unit: '%', icon: 'Target' });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'goals');
    }
  };

  const updateProgress = async (goal: Goal, amount: number) => {
    try {
      const newProgress = Math.min(goal.target, Math.max(0, goal.progress + amount));
      const updates: any = { progress: newProgress };
      if (newProgress >= goal.target) {
        updates.status = 'Completed';
      } else {
        updates.status = 'Active';
      }
      await updateDoc(doc(db, 'goals', goal.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goal.id}`);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
    }
  };

  return (
    <main className="px-6 pt-4 pb-32 max-w-5xl mx-auto">
      <section className="mb-10 mt-4 flex justify-between items-end">
        <div>
          <span className="font-label text-on-surface-variant text-[0.6875rem] font-semibold uppercase tracking-wider mb-2 block">Vision & Ambition</span>
          <h2 className="font-headline text-5xl font-bold tracking-tight leading-none">Strategic Goals</h2>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
        >
          {showAdd ? <X size={24} /> : <Plus size={24} />}
        </button>
      </section>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addGoal}
          className="mb-10 p-8 bg-surface-container-low rounded-2xl shadow-card space-y-6 border border-outline-variant/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Goal Title</label>
              <input 
                type="text" 
                placeholder="e.g. Run a Marathon"
                className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
              <input 
                type="text" 
                placeholder="e.g. Fitness"
                className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
                value={newGoal.category}
                onChange={e => setNewGoal({...newGoal, category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Value</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="w-24 bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
                  value={newGoal.target}
                  onChange={e => setNewGoal({...newGoal, target: parseInt(e.target.value) || 100})}
                />
                <input 
                  type="text" 
                  placeholder="unit (e.g. km, %)"
                  className="flex-1 bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
                  value={newGoal.unit}
                  onChange={e => setNewGoal({...newGoal, unit: e.target.value})}
                />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20">Set Goal</button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-50">
            <Target size={48} className="mx-auto mb-4" />
            <p>No goals set yet. What do you want to achieve?</p>
          </div>
        )}
        {goals.map(goal => (
          <div key={goal.id} className="bg-surface-container-low rounded-2xl p-6 shadow-card border border-outline-variant/10 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg">{goal.title}</h3>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest">{goal.category}</p>
                </div>
              </div>
              <button 
                onClick={() => deleteGoal(goal.id)}
                className="p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold">{goal.progress}<span className="text-sm text-on-surface-variant font-medium ml-1">/ {goal.target} {goal.unit}</span></span>
                <span className="text-sm font-bold text-primary">{Math.round((goal.progress / goal.target) * 100)}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(goal.progress / goal.target) * 100}%` }}
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(77,166,255,0.3)]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => updateProgress(goal, -1)}
                  className="flex-1 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Decrease
                </button>
                <button 
                  onClick={() => updateProgress(goal, 1)}
                  className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/10 active:scale-95 transition-all"
                >
                  Increase
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

const FinanceScreen = ({ transactions, user, currency }: { transactions: Transaction[], user: FirebaseUser | null, currency: string }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ merchant: '', amount: '', category: 'Dining', type: 'expense' as 'expense' | 'income' });

  const totalBalance = transactions.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);
  const monthlySpending = Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0));

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTx.merchant || !newTx.amount) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTx,
        amount: parseFloat(newTx.amount),
        uid: user.uid,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        icon: newTx.category === 'Dining' ? 'utensils' : newTx.category === 'Income' ? 'trending-up' : 'zap'
      });
      setNewTx({ merchant: '', amount: '', category: 'Dining', type: 'expense' });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  return (
  <main className="px-6 pt-4 pb-32 max-w-4xl mx-auto relative">
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none -z-10"></div>
    <section className="mb-10 flex justify-between items-end">
      <div>
        <span className="font-label text-xs uppercase tracking-widest text-primary mb-2 block">Dashboard</span>
        <h2 className="font-headline text-5xl font-bold leading-none tracking-tight">Financial Health</h2>
      </div>
      <button 
        onClick={() => setShowAdd(!showAdd)}
        className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
      >
        {showAdd ? <X size={24} /> : <Plus size={24} />}
      </button>
    </section>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={addTransaction}
        className="mb-10 p-8 bg-surface-container-low rounded-2xl shadow-card space-y-6 border border-outline-variant/10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Merchant/Source</label>
            <input 
              type="text" 
              placeholder="e.g. Starbucks"
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              value={newTx.merchant}
              onChange={e => setNewTx({...newTx, merchant: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Amount</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              value={newTx.amount}
              onChange={e => setNewTx({...newTx, amount: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface"
              value={newTx.category}
              onChange={e => setNewTx({...newTx, category: e.target.value})}
            >
              <option value="Dining">Dining</option>
              <option value="Bills">Bills</option>
              <option value="Shopping">Shopping</option>
              <option value="Income">Income</option>
              <option value="Transport">Transport</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Type</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setNewTx({...newTx, type: 'expense'})}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${newTx.type === 'expense' ? 'bg-error text-on-error' : 'bg-surface-container-high text-on-surface'}`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => setNewTx({...newTx, type: 'income'})}
                className={`flex-1 py-4 rounded-xl font-bold transition-all ${newTx.type === 'income' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}
              >
                Income
              </button>
            </div>
          </div>
        </div>
        <button type="submit" className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20">Add Transaction</button>
      </motion.form>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <div className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-between min-h-[180px] hover:bg-surface-container transition-colors duration-300 shadow-card">
        <div className="flex justify-between items-start">
          <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">Total Balance</span>
          <Wallet className="text-primary" size={24} />
        </div>
        <div>
          <p className="text-[2.5rem] font-headline font-bold text-on-surface">{currency}{totalBalance.toLocaleString()}</p>
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
          <p className="text-[2.5rem] font-headline font-bold text-on-surface">{currency}{monthlySpending.toLocaleString()}</p>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-3 overflow-hidden shadow-inner">
            <div className="bg-primary h-full w-[65%] rounded-full"></div>
          </div>
          <p className="text-on-surface-variant text-xs mt-2 uppercase tracking-tighter">65% of monthly budget</p>
        </div>
      </div>
    </div>

    <section className="mb-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline text-xl font-semibold">Recent Transactions</h3>
        <button className="text-primary font-semibold text-sm">View All</button>
      </div>
      <div className="space-y-4">
        {transactions.length === 0 && (
          <div className="py-20 text-center opacity-50">
            <CreditCard size={48} className="mx-auto mb-4" />
            <p>No transactions yet. Add one to track your finances!</p>
          </div>
        )}
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg hover:bg-surface-container transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                {tx.category === 'Dining' && <Utensils className="text-primary" size={20} />}
                {tx.category === 'Income' && <TrendingUp className="text-tertiary" size={20} />}
                {tx.category === 'Bills' && <Zap className="text-secondary" size={20} />}
                {tx.category === 'Shopping' && <ShoppingCart className="text-primary" size={20} />}
                {tx.category === 'Transport' && <Activity className="text-primary" size={20} />}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{tx.merchant}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-tighter">{tx.category} • {tx.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className={`font-bold ${tx.type === 'income' ? 'text-primary' : 'text-on-surface'}`}>
                {tx.type === 'income' ? '+' : '-'}{currency}{Math.abs(tx.amount).toFixed(2)}
              </p>
              <button 
                onClick={() => deleteTransaction(tx.id)}
                className="p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  </main>
  );
};

const AIScreen = ({ messages, user }: { messages: AIMessage[], user: FirebaseUser | null }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // 1. Save user message
      await addDoc(collection(db, 'ai_messages'), {
        uid: user.uid,
        role: 'user',
        text: userMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp()
      });

      // 2. Get AI response
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: "You are LifeOS AI, a personal growth and productivity assistant. You provide insights on tasks, habits, and finances. Be concise, encouraging, and professional. Use markdown for formatting."
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't process that.";

      // 3. Save AI message
      await addDoc(collection(db, 'ai_messages'), {
        uid: user.uid,
        role: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        insights: aiText.length > 100
      });

    } catch (error) {
      console.error("AI Error:", error);
      // Fallback message
      await addDoc(collection(db, 'ai_messages'), {
        uid: user.uid,
        role: 'ai',
        text: "I'm having some trouble connecting to my brain right now. Please try again later.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    "Analyze my spending this week",
    "Suggest a new morning habit",
    "How can I prioritize my tasks?",
    "Give me a productivity tip"
  ];

  return (
    <main className="flex flex-col h-full relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none opacity-50"></div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-8 pb-40 space-y-8 relative z-10 scroll-smooth">
        <div className="flex justify-center">
          <span className="font-label text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/10">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {messages.length === 0 && (
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary shadow-lg shadow-primary/10 animate-pulse">
              <Bot size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="font-headline text-3xl font-bold text-on-surface">Hello, {user?.displayName?.split(' ')[0]}</h2>
              <p className="text-on-surface-variant max-w-xs mx-auto">I'm your LifeOS companion. How can I help you optimize your day?</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto px-4">
              {quickPrompts.map(prompt => (
                <button 
                  key={prompt}
                  onClick={() => { setInput(prompt); }}
                  className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-full border border-outline-variant/10 transition-all active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-3`}>
            {msg.role === 'ai' && (
              <div className="flex items-center gap-3 ml-2">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-sm border border-primary/20">
                  <Bot className="text-on-primary-container" size={18} />
                </div>
                <span className="font-label text-[0.75rem] font-bold text-primary uppercase tracking-widest">LifeOS Intelligence</span>
              </div>
            )}
            <div className={`max-w-[85%] flex flex-col gap-2`}>
              <div className={`px-5 py-4 rounded-2xl shadow-card ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-tr-none' : 'bg-surface-container-low border border-outline-variant/20 rounded-tl-none text-on-surface'}`}>
                <div className="prose prose-sm prose-invert max-w-none">
                  <Markdown>{msg.text}</Markdown>
                </div>
                <div className={`text-[10px] mt-2 font-bold uppercase tracking-tighter opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.time}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3 ml-2">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center animate-pulse">
                <Bot className="text-on-primary-container" size={18} />
              </div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/20 px-5 py-4 rounded-2xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-6 z-20">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={sendMessage}
            className="bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-2 flex items-center gap-2 shadow-2xl"
          >
            <button type="button" className="p-3 text-on-surface-variant hover:text-primary transition-colors">
              <PlusCircle size={24} />
            </button>
            <input 
              type="text" 
              placeholder="Ask LifeOS anything..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface py-3"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className={`p-3 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface-variant'}`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

const ProfileScreen = ({ theme, setTheme, userProfile, currency, setCurrency }: { theme: string, setTheme: (t: string) => void, userProfile: any, currency: string, setCurrency: (c: string) => void }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editName, setEditName] = useState(userProfile?.displayName || '');
  const [editEmail, setEditEmail] = useState(userProfile?.email || '');
  const [hideEmail, setHideEmail] = useState(userProfile?.hideEmail || false);
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(userProfile?.photoURL || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    setEditName(userProfile?.displayName || '');
    setEditEmail(userProfile?.email || '');
    setHideEmail(userProfile?.hideEmail || false);
    setEditPhone(userProfile?.phone || '');
    setEditPhotoUrl(userProfile?.photoURL || '');
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: editName,
        email: editEmail,
        hideEmail: hideEmail,
        phone: editPhone,
        photoURL: editPhotoUrl
      });
      setActiveModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

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
                {['dark', 'light'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setTheme(m)}
                    className={`p-4 rounded-xl border ${theme === m ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/20 text-on-surface'} text-sm font-bold capitalize transition-colors`}
                  >
                    {m} Mode
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Theme Selection</h5>
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
            </div>
          </div>
        );
      case 'edit_profile':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Edit Profile</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Email</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">Hide Email in Profile</span>
                  <button onClick={() => setHideEmail(!hideEmail)} className={`w-12 h-6 rounded-full transition-colors relative ${hideEmail ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                    <div className={`w-4 h-4 rounded-full bg-surface absolute top-1 transition-transform ${hideEmail ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Phone No.</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                      {editPhotoUrl ? <img src={editPhotoUrl} className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-on-surface-variant" />}
                    </div>
                    <label className="px-4 py-2 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm font-medium cursor-pointer hover:bg-surface-container-highest transition-colors">
                      Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditPhotoUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>
              </div>
              <button onClick={handleSaveProfile} className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold shadow-lg mt-4">Save Changes</button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
              <div>
                <h5 className="font-bold text-sm">Push Notifications</h5>
                <p className="text-xs text-on-surface-variant">Receive alerts and reminders</p>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)} 
                className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-surface absolute top-1 transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-xl border border-outline-variant/10">
              <div>
                <h5 className="font-bold text-sm">Biometric Login</h5>
                <p className="text-xs text-on-surface-variant">Use Face ID / Touch ID</p>
              </div>
              <button 
                onClick={() => setBiometricsEnabled(!biometricsEnabled)} 
                className={`w-12 h-6 rounded-full transition-colors relative ${biometricsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-surface absolute top-1 transition-transform ${biometricsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        );
      case 'app_prefs':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h5 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Currency</h5>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              >
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
                <option value="¥">JPY (¥)</option>
                <option value="₹">INR (₹)</option>
                <option value="A$">AUD (A$)</option>
                <option value="C$">CAD (C$)</option>
              </select>
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
          <div 
            className="w-32 h-32 rounded-xl bg-surface-container-low p-1 ring-1 ring-outline-variant/20 overflow-hidden shadow-card cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setActiveModal('edit_profile')}
          >
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
          {!userProfile?.hideEmail && <p className="text-on-surface-variant font-body mt-1">{userProfile?.email || ""}</p>}
          {userProfile?.phone && <p className="text-on-surface-variant font-body mt-1 text-sm">{userProfile.phone}</p>}
        </div>
        <button 
          onClick={() => logOut()}
          className="flex items-center gap-2 px-6 py-2 bg-error/10 text-error rounded-full font-bold text-sm hover:bg-error/20 transition-colors"
        >
          <LogOut size={16} /> Log Out
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between aspect-video text-on-primary-container shadow-card">
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

const Onboarding = ({ onFinish, authError, currency }: { onFinish: () => void | Promise<void>, authError: string | null, currency: string }) => {
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
                <span className="text-[2.5rem] font-headline font-bold text-on-surface tracking-tighter">{currency}4,280</span>
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
              <span className="text-lg font-headline font-bold text-on-surface">{currency}842.00</span>
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
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm text-center font-medium"
          >
            {authError}
          </motion.div>
        )}
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currency, setCurrency] = useState('$');

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Fallback to locale-based currency
        const locale = navigator.language || 'en-US';
        const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
        const symbol = formatter.formatToParts(0).find(p => p.type === 'currency')?.value || '$';
        
        // Try to get more accurate currency based on geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await response.json();
              const countryCode = data.address?.country_code?.toUpperCase();
              
              const currencyMap: Record<string, string> = {
                'US': '$', 'IN': '₹', 'GB': '£', 'FR': '€', 'DE': '€', 'IT': '€', 'ES': '€',
                'JP': '¥', 'CN': '¥', 'RU': '₽', 'BR': 'R$', 'CA': 'C$', 'AU': 'A$'
              };
              
              if (countryCode && currencyMap[countryCode]) {
                setCurrency(currencyMap[countryCode]);
              } else {
                setCurrency(symbol);
              }
            } catch (e) {
              setCurrency(symbol);
            }
          }, () => setCurrency(symbol));
        } else {
          setCurrency(symbol);
        }
      } catch (e) {
        setCurrency('$');
      }
    };
    detectCurrency();
  }, []);

  const calculateProductivityScore = () => {
    if (tasks.length === 0 && habits.length === 0 && goals.length === 0) return 0;
    
    const taskWeight = 0.4;
    const habitWeight = 0.3;
    const goalWeight = 0.3;
    
    const taskScore = tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 100;
    
    const habitScore = habits.length > 0 ? (habits.reduce((acc, h) => {
      const displayProgress = isNewCycle(h) ? 0 : h.progress;
      return acc + (displayProgress / h.target);
    }, 0) / habits.length) * 100 : 100;
    
    const goalScore = goals.length > 0 ? (goals.reduce((acc, g) => acc + (g.progress / g.target), 0) / goals.length) * 100 : 100;
    
    return Math.round((taskScore * taskWeight) + (habitScore * habitWeight) + (goalScore * goalWeight));
  };

  const productivityScore = calculateProductivityScore();
  const [authError, setAuthError] = useState<string | null>(null);
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

    // Goals
    const goalsRef = collection(db, 'goals');
    const goalsQuery = query(goalsRef, where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
      setGoals(goalsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'goals'));

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
      unsubGoals();
      unsubTransactions();
      unsubAiMessages();
    };
  }, [user]);

  const handleOnboardingFinish = async () => {
    setAuthError(null);
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
      } else {
        // User cancelled or closed popup
        setAuthError("Sign-in cancelled. Please try again.");
      }
    } catch (error: any) {
      console.error("Onboarding error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized in Firebase. Please add the current URL to 'Authorized domains' in your Firebase Console.");
      } else {
        setAuthError(error.message || "An error occurred during sign-in.");
      }
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
    return <Onboarding onFinish={handleOnboardingFinish} authError={authError} currency={currency} />;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding': return <Onboarding onFinish={handleOnboardingFinish} authError={authError} currency={currency} />;
      case 'dashboard': return <Dashboard setScreen={setScreen} tasks={tasks} habits={habits} goals={goals} transactions={transactions} userProfile={userProfile} productivityScore={productivityScore} currency={currency} />;
      case 'tasks': return <TasksScreen tasks={tasks} user={user} />;
      case 'habits': return <HabitsScreen habits={habits} user={user} />;
      case 'goals': return <GoalsScreen goals={goals} user={user} />;
      case 'finance': return <FinanceScreen transactions={transactions} user={user} currency={currency} />;
      case 'ai': return <AIScreen messages={aiMessages} user={user} />;
      case 'profile': return <ProfileScreen theme={theme} setTheme={setTheme} userProfile={userProfile} currency={currency} setCurrency={setCurrency} />;
      default: return <Dashboard setScreen={setScreen} tasks={tasks} habits={habits} goals={goals} transactions={transactions} userProfile={userProfile} productivityScore={productivityScore} currency={currency} />;
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
