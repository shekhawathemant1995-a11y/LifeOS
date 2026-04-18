import { 
  Home, 
  CheckCircle2, 
  CreditCard, 
  User, 
  Edit2,
  Search, 
  Bell, 
  TrendingUp, 
  TrendingDown, 
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
  Tag,
  Fingerprint,
  Sun,
  Moon,
  Coffee,
  Briefcase,
  Heart,
  DollarSign,
  MoreVertical
} from 'lucide-react';
import * as React from 'react';
import { useState, useEffect, useCallback, ReactNode, Component, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Task, Habit, Goal, Transaction } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { 
  db,
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
  getDocFromServer
} from './db';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';

// --- Database Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    }
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  // throw new Error(JSON.stringify(errInfo)); // Don't throw to prevent crashing the whole app on minor fetch errors
}

// --- AI Retry Utility ---
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = 
      error?.status === 429 || 
      error?.code === 429 || 
      error?.error?.code === 429 ||
      error?.message?.includes('429') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      (typeof error === 'string' && error.includes('429')) ||
      (error?.error?.status === 'RESOURCE_EXHAUSTED');

    if (retries > 0 && isRateLimit) {
      console.warn(`AI Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// WebAuthn Helpers
const generateChallenge = () => {
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  return challenge;
};

const isIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const registerBiometric = async (userEmail: string, userId: string) => {
  if (!window.PublicKeyCredential) {
    throw new Error("Biometrics not supported on this device.");
  }
  if (isIframe()) {
    console.warn("Simulating biometric registration in iframe.");
    return { id: 'simulated-credential', type: 'public-key' };
  }
  const challenge = generateChallenge();
  const userIdBuffer = new TextEncoder().encode(userId);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: "LifeOS", id: window.location.hostname },
    user: { id: userIdBuffer, name: userEmail, displayName: userEmail },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
    timeout: 60000,
    attestation: "none"
  };
  const credential = await navigator.credentials.create({ publicKey });
  return credential;
};

const authenticateBiometric = async () => {
  if (!window.PublicKeyCredential) {
    throw new Error("Biometrics not supported on this device.");
  }
  if (isIframe()) {
    console.warn("Simulating biometric authentication in iframe.");
    return { id: 'simulated-assertion', type: 'public-key' };
  }
  const challenge = generateChallenge();
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    userVerification: "required",
    timeout: 60000,
  };
  const assertion = await navigator.credentials.get({ publicKey });
  return assertion;
};

const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    try {
      setError('');
      await authenticateBiometric();
      onUnlock();
    } catch (err) {
      console.error(err);
      setError('Biometric authentication failed. Please try again.');
    }
  };

  useEffect(() => {
    handleUnlock();
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 aurora-glow pointer-events-none opacity-50"></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 flex flex-col items-center text-center space-y-8"
      >
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20"
        >
          <Shield size={48} />
        </motion.div>
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">App Locked</h1>
          <p className="text-on-surface-variant">Use your device biometrics to unlock LifeOS.</p>
        </div>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-error text-sm font-medium"
          >
            {error}
          </motion.p>
        )}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUnlock}
          className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold shadow-lg shadow-primary/20 flex items-center gap-3"
        >
          <Fingerprint size={20} />
          Unlock Now
        </motion.button>
      </motion.div>
    </div>
  );
};

// Components
const BottomNav = ({ currentScreen, setScreen }: { currentScreen: Screen, setScreen: (s: Screen) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
    { id: 'habits', label: 'Habits', icon: Zap },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'finance', label: 'Money', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-0 w-full z-50 bg-surface/95 backdrop-blur-3xl border-t border-outline-variant/10 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
      <div className="flex w-full justify-around items-center px-0.5 py-1.5 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setScreen(item.id as Screen)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-all duration-300 relative ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 ${isActive ? 'bg-primary/20 scale-110 shadow-md shadow-primary/15' : 'scale-95'}`}>
                <item.icon size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`font-inter text-[0.45rem] sm:text-[0.5rem] font-bold uppercase tracking-tighter mt-1 transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-90'} hidden xs:block`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className="absolute bottom-0 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(77,166,255,0.6)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const TopBar = ({ title, userImage }: { title: string, userImage?: string }) => (
  <header id="top-bar" className="bg-surface sticky top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-outline-variant/5">
    <div className="flex items-center gap-2 sm:gap-3">
      <div id="user-avatar-container" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20">
        <img 
          id="user-avatar-img"
          src={userImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuDj-iAgC_T1e_GkAni5Xa9GBj4eoBiuznpmXQhzzvbXA-zu8npRTZYgy2m2GkiqcGTpg7Czmy9PyvopDVS4yqF1tskx214d7fhrtbomJi5sYOoZTT5fYntiPoWYfD6XK2LxXHYygeca1YQyv7LB6OfRfa3iuvg7Xdu28W-N9tBaNmKm-Lbi8bnYRJlQO4B_Bhqs_2t0M3lL3jyrxasHu8ipweRmGO5SrkWs5b7w_8zQALLn0x68Jliy-eM-1EStWcbW8IZZ46t72Yw"} 
          alt="User Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
      <span id="app-title" className="font-headline font-bold tracking-tight text-xl sm:text-2xl md:text-[1.75rem] text-on-surface truncate max-w-[150px] sm:max-w-none">{title}</span>
    </div>
    <div className="flex items-center gap-2 sm:gap-4">
      <button id="search-btn" className="p-2 rounded-full hover:bg-surface-container-high transition-colors duration-200 text-on-surface-variant">
        <Search size={18} className="sm:w-5 sm:h-5" />
      </button>
      <button id="notifications-btn" className="p-2 rounded-full hover:bg-surface-container-high transition-colors duration-200 text-on-surface-variant">
        <Bell size={18} className="sm:w-5 sm:h-5" />
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

  const toggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  return (
    <main className="pt-4 pb-32 px-4 sm:px-6 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <section className="mb-6 sm:mb-10">
        <h1 className="font-headline font-bold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight mb-2">
          Good Morning,<br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-container">{userProfile?.displayName?.split(' ')[0] || "User"}</span>
        </h1>
        <p className="text-on-surface-variant font-medium text-sm sm:text-lg">Your day is {efficiency}% complete. {activeTasks.length} priorities left.</p>
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
          <AnimatePresence>
            {tasks.length === 0 && <p className="text-on-surface-variant text-sm py-4">No tasks for today. Add some to stay focused!</p>}
            {tasks.slice(0, 3).map(task => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={task.id} 
                onClick={() => toggleTask(task)}
                className={`flex items-center p-4 bg-surface-container rounded-lg group-hover:bg-surface-container-high transition-colors shadow-sm cursor-pointer ${task.completed ? 'opacity-60' : ''}`}
              >
                <motion.div 
                  whileTap={{ scale: 0.8 }}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all mr-4 relative overflow-hidden ${task.completed ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/20 text-outline'}`}
                >
                  <AnimatePresence mode="wait">
                    {task.completed ? (
                      <motion.div
                        key="checked"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 45 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center bg-primary text-on-primary"
                      >
                        <CheckCircle2 size={16} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="unchecked"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Circle size={16} className="text-outline-variant" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div className="flex-1">
                  <p className={`text-on-surface font-medium transition-all duration-300 ${task.completed ? 'line-through text-on-surface-variant' : ''}`}>{task.title}</p>
                  <p className="text-on-surface-variant text-xs uppercase tracking-widest mt-1">{task.category} • {task.time}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const addTask = async (e: FormEvent) => {
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'work': return <Briefcase size={18} />;
      case 'personal': return <Heart size={18} />;
      case 'health': return <Activity size={18} />;
      case 'finance': return <DollarSign size={18} />;
      default: return <Tag size={18} />;
    }
  };

  const getTimeIcon = (time: string) => {
    switch (time.toLowerCase()) {
      case 'morning': return <Coffee size={14} />;
      case 'afternoon': return <Sun size={14} />;
      case 'evening': return <Moon size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
  <main className="px-4 sm:px-6 pt-8 pb-32 max-w-2xl mx-auto">
    {/* Header & Progress */}
    <div className="mb-8 sm:mb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Tasks</h1>
          <p className="text-on-surface-variant font-body text-sm">Manage your daily routine</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-glow-primary active:scale-90 transition-all"
        >
          {showAdd ? <X size={24} className="sm:w-7 sm:h-7" /> : <Plus size={24} className="sm:w-7 sm:h-7" />}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-card"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-10 -mt-10 rounded-full"></div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between relative z-10 gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Today's Progress</h2>
            <p className="text-on-surface-variant text-sm font-medium bg-surface-container-high px-3 py-1 rounded-full inline-block">
              {completedCount} of {totalCount} tasks completed
            </p>
            <div className="pt-6 flex items-center justify-center sm:justify-start gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-xs font-semibold text-on-surface-variant">
                    {i === 3 ? '+5' : <User size={14} />}
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Team Active</span>
            </div>
          </div>
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                className="text-surface-container-highest"
              />
              <motion.circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="301.6"
                initial={{ strokeDashoffset: 301.6 }}
                animate={{ strokeDashoffset: 301.6 - (301.6 * progressPercent) / 100 }}
                className="text-primary"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-on-surface">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        onSubmit={addTask}
        className="mb-10 p-6 sm:p-8 bg-surface-container-low rounded-[2rem] shadow-card space-y-4 sm:space-y-6 border border-outline-variant/10"
      >
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Task Title</label>
          <input 
            type="text" 
            placeholder="What needs to be done?"
            className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-primary transition-all"
            value={newTask.title}
            onChange={e => setNewTask({...newTask, title: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Priority</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface appearance-none"
              value={newTask.priority}
              onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Category</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface appearance-none"
              value={newTask.category}
              onChange={e => setNewTask({...newTask, category: e.target.value})}
            >
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Health">Health</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full py-4 sm:py-5 bg-primary text-on-primary rounded-2xl font-bold text-base sm:text-lg shadow-glow-primary active:scale-95 transition-all">Create Task</button>
      </motion.form>
    )}

    {/* Filters */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-8 gap-4">
      <div className="flex bg-surface-container-low p-1 rounded-2xl shadow-inner border border-outline-variant/10 overflow-x-auto no-scrollbar">
        {(['all', 'work', 'personal'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
              filter === f ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="relative z-10">{f}</span>
            {filter === f && (
              <motion.div 
                layoutId="taskFilter"
                className="absolute inset-0 bg-primary rounded-xl shadow-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      
      <button 
        onClick={() => setSortBy(sortBy === 'priority' ? 'dueDate' : 'priority')}
        className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/10 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
      >
        <MoreVertical size={20} />
      </button>
    </div>

    {/* Task List */}
    <div className="space-y-4">
      {filteredTasks.length === 0 && (
        <div className="py-20 text-center opacity-50">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <p className="font-medium">All caught up!</p>
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {filteredTasks.map(task => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key={task.id} 
            className={`group relative p-6 rounded-[2rem] bg-surface-container-low border border-outline-variant/5 shadow-sm hover:shadow-card transition-all duration-300 ${task.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}
          >
            <div className="flex items-center gap-5">
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={() => toggleTask(task)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative overflow-hidden ${
                  task.completed 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface-container-high text-outline-variant hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {task.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
              </motion.button>

              <div className="flex-1 min-w-0" onClick={() => toggleTask(task)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    task.priority === 'high' ? 'bg-error/10 text-error' : 
                    task.priority === 'medium' ? 'bg-tertiary/10 text-tertiary' : 
                    'bg-primary/10 text-primary'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-on-surface-variant/40">•</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    {getCategoryIcon(task.category || 'Work')}
                    <span>{task.category}</span>
                  </div>
                </div>
                <h3 className={`font-headline text-xl font-bold text-on-surface truncate transition-all ${task.completed ? 'line-through text-on-surface-variant' : ''}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    {getTimeIcon(task.time || 'Morning')}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{task.time || 'Morning'}</span>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="p-3 text-error/40 hover:text-error hover:bg-error/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </main>
  );
};

const HabitsScreen = ({ habits, user }: { habits: Habit[], user: FirebaseUser | null }) => {
  const [activeTab, setActiveTab] = useState('Daily');
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ title: '', frequency: 'Daily', target: 1, unit: 'times', icon: 'zap' });
  
  const filteredHabits = habits.filter(h => h.frequency === activeTab);

  const addHabit = async (e: FormEvent) => {
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

  const successRate = habits.length > 0 
    ? Math.round((habits.filter(h => h.progress >= h.target).length / habits.length) * 100) 
    : 0;

  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  return (
  <main className="px-4 sm:px-6 pt-8 pb-32 max-w-5xl mx-auto relative overflow-hidden">
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none -z-10"></div>
    
    <header className="mb-8 sm:mb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Habits</h1>
          <p className="text-on-surface-variant font-body text-sm">Build your consistency</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shadow-glow-secondary active:scale-90 transition-all"
        >
          {showAdd ? <X size={24} className="sm:w-7 sm:h-7" /> : <Plus size={24} className="sm:w-7 sm:h-7" />}
        </button>
      </div>
    </header>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={addHabit}
        className="mb-10 p-6 sm:p-8 bg-surface-container-low rounded-[2rem] shadow-card space-y-4 sm:space-y-6 border border-outline-variant/10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Habit Name</label>
            <input 
              type="text" 
              placeholder="e.g. Morning Meditation"
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-secondary transition-all"
              value={newHabit.title}
              onChange={e => setNewHabit({...newHabit, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Frequency</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface appearance-none"
              value={newHabit.frequency}
              onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Target</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                className="w-20 sm:w-24 bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface"
                value={newHabit.target}
                onChange={e => setNewHabit({...newHabit, target: parseInt(e.target.value) || 1})}
              />
              <input 
                type="text" 
                placeholder="times"
                className="flex-1 bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface"
                value={newHabit.unit}
                onChange={e => setNewHabit({...newHabit, unit: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Icon</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface appearance-none"
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
        <button type="submit" className="w-full py-4 sm:py-5 bg-secondary text-on-secondary rounded-2xl font-bold text-base sm:text-lg shadow-glow-secondary active:scale-95 transition-all">Create Habit</button>
      </motion.form>
    )}

    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
      <div className="md:col-span-8 glass rounded-[2.5rem] p-8 relative overflow-hidden shadow-card">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-headline text-2xl font-bold">Weekly Consistency</h3>
            <p className="text-on-surface-variant text-sm">Don't break the chain!</p>
          </div>
          <div className="px-4 py-2 bg-secondary/10 rounded-xl">
            <span className="text-secondary text-xs font-bold uppercase tracking-widest">{successRate}% Success</span>
          </div>
        </div>
        <div className="flex justify-between items-center gap-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const isToday = i === currentDayIndex;
            const isCompleted = isToday && habits.length > 0 && habits.every(h => h.progress >= h.target);
            const someProgress = isToday && habits.length > 0 && habits.some(h => h.progress > 0);
            
            return (
              <div key={i} className="flex flex-col items-center gap-3 flex-1">
                <div className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-secondary text-on-secondary shadow-glow-secondary' : 
                  someProgress ? 'bg-secondary/20 text-secondary border-2 border-secondary/30' : 
                  'bg-surface-container-high text-on-surface-variant/30'
                }`}>
                  {isCompleted ? <CheckCircle2 size={24} /> : <span className="text-xs font-bold">{day}</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-secondary' : 'text-on-surface-variant/40'}`}>
                  {isToday ? 'Today' : day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:col-span-4 bg-primary rounded-[2.5rem] p-8 text-on-primary shadow-card relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-2xl font-bold leading-tight">Master your routine</h3>
          </div>
          <div className="mt-8">
            <p className="text-sm opacity-80 mb-4">Consistency is the key to building long-term habits.</p>
            <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm shadow-lg">View Progress</button>
          </div>
        </div>
      </div>
    </div>

    <div className="flex bg-surface-container-low p-1.5 rounded-2xl shadow-inner border border-outline-variant/10 w-fit mb-8">
      {(['Daily', 'Weekly', 'Monthly'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setActiveTab(t)}
          className={`px-8 py-2.5 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest transition-all relative ${
            activeTab === t ? 'text-on-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="relative z-10">{t}</span>
          {activeTab === t && (
            <motion.div 
              layoutId="habitTab"
              className="absolute inset-0 bg-secondary rounded-xl shadow-md"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {filteredHabits.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="col-span-full py-20 text-center opacity-50"
          >
            <Zap size={48} className="mx-auto mb-4" />
            <p>No {activeTab.toLowerCase()} habits yet.</p>
          </motion.div>
        )}
        {filteredHabits.map((habit) => {
          const reset = isNewCycle(habit);
          const displayProgress = reset ? 0 : habit.progress;
          const isCompleted = displayProgress >= habit.target;
          const progressPercent = Math.min((displayProgress / habit.target) * 100, 100);

          return (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={habit.id} 
            className={`group relative p-8 rounded-[2.5rem] bg-surface-container-low border border-outline-variant/5 shadow-sm hover:shadow-card transition-all duration-300 ${isCompleted ? 'opacity-70 grayscale-[0.3]' : ''}`}
          >
            <button 
              onClick={() => deleteHabit(habit.id)}
              className="absolute top-6 right-6 p-2 text-error/40 hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-surface-container-high"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="351.8"
                    initial={{ strokeDashoffset: 351.8 }}
                    animate={{ strokeDashoffset: 351.8 - (351.8 * progressPercent) / 100 }}
                    className="text-secondary"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-secondary text-on-secondary shadow-glow-secondary' : 'bg-secondary/10 text-secondary'}`}>
                    {habit.icon === 'zap' && <Zap size={32} />}
                    {habit.icon === 'droplets' && <Droplets size={32} />}
                    {habit.icon === 'book-open' && <BookOpen size={32} />}
                    {habit.icon === 'brain' && <Brain size={32} />}
                    {habit.icon === 'activity' && <Activity size={32} />}
                  </div>
                </div>
              </div>

              <h4 className={`font-headline text-xl font-bold mb-1 transition-colors ${isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{habit.title}</h4>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-secondary text-[10px] font-bold uppercase tracking-widest">{habit.streak} Streak</span>
                <span className="text-on-surface-variant/40">•</span>
                <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{displayProgress}/{habit.target} {habit.unit}</span>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => checkIn(habit)}
                disabled={isCompleted}
                className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${isCompleted ? 'bg-secondary/20 text-secondary cursor-not-allowed' : 'bg-secondary text-on-secondary shadow-glow-secondary active:scale-95'}`}
              >
                {isCompleted ? 'Completed' : 'Check In'}
              </motion.button>
            </div>
          </motion.div>
        )})}
      </AnimatePresence>
    </div>
  </main>
  );
};

const GoalsScreen = ({ goals, user }: { goals: Goal[], user: FirebaseUser | null }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', category: '', target: 100, unit: '%', icon: 'Target' });

  const addGoal = async (e: FormEvent) => {
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
    <main className="px-4 sm:px-6 pt-8 pb-32 max-w-5xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full aurora-glow opacity-10 pointer-events-none -z-10"></div>
      
      <header className="mb-8 sm:mb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Goals</h1>
            <p className="text-on-surface-variant font-body text-sm">Design your future</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center shadow-glow-secondary active:scale-90 transition-all"
          >
            {showAdd ? <X size={24} className="sm:w-7 sm:h-7" /> : <Plus size={24} className="sm:w-7 sm:h-7" />}
          </button>
        </div>
      </header>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addGoal}
          className="mb-10 p-6 sm:p-8 bg-surface-container-low rounded-[2rem] shadow-card space-y-4 sm:space-y-6 border border-outline-variant/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Goal Title</label>
              <input 
                type="text" 
                placeholder="e.g. Run a Marathon"
                className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-tertiary transition-all"
                value={newGoal.title}
                onChange={e => setNewGoal({...newGoal, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Category</label>
              <input 
                type="text" 
                placeholder="e.g. Fitness"
                className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-tertiary transition-all"
                value={newGoal.category}
                onChange={e => setNewGoal({...newGoal, category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Target Value</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="w-20 sm:w-24 bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface"
                  value={newGoal.target}
                  onChange={e => setNewGoal({...newGoal, target: parseInt(e.target.value) || 100})}
                />
                <input 
                  type="text" 
                  placeholder="unit"
                  className="flex-1 bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface"
                  value={newGoal.unit}
                  onChange={e => setNewGoal({...newGoal, unit: e.target.value})}
                />
              </div>
            </div>
          </div>
          <button type="submit" className="w-full py-4 sm:py-5 bg-tertiary text-on-tertiary rounded-2xl font-bold text-base sm:text-lg shadow-glow-secondary active:scale-95 transition-all">Set Strategic Goal</button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {goals.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-50">
            <Target size={48} className="mx-auto mb-4" />
            <p>No goals set yet. What's your next big achievement?</p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {goals.map((goal, i) => {
            const progressPercent = Math.round((goal.progress / goal.target) * 100);
            return (
            <motion.div 
              key={goal.id} 
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="bg-surface-container-low rounded-[2.5rem] p-8 shadow-sm hover:shadow-card border border-outline-variant/5 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-[5rem] -mr-10 -mt-10 transition-all group-hover:scale-110"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary shadow-inner">
                    <Target size={32} />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-2xl text-on-surface">{goal.title}</h3>
                    <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em]">{goal.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteGoal(goal.id)}
                  className="p-3 text-error/40 hover:text-error hover:bg-error/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-on-surface">{goal.progress}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Current {goal.unit}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-tertiary">{progressPercent}%</span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Target: {goal.target}</span>
                  </div>
                </div>
                
                <div className="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden p-1 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full bg-tertiary rounded-full shadow-glow-secondary"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateProgress(goal, -1)}
                    className="flex-1 py-4 bg-surface-container-high hover:bg-surface-container-highest rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Decrease
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateProgress(goal, 1)}
                    className="flex-1 py-4 bg-tertiary text-on-tertiary rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-glow-secondary active:scale-95 transition-all"
                  >
                    Increase
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )})}
        </AnimatePresence>
      </div>
    </main>
  );
};

const FinanceScreen = ({ transactions, user, currency, userProfile }: { transactions: Transaction[], user: FirebaseUser | null, currency: string, userProfile: any }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [timeframe, setTimeframe] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ merchant: '', amount: '', category: 'Dining', type: 'expense' as 'expense' | 'income' });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const totalBalance = transactions.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);
  const monthlySpending = Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0));
  const monthlyBudget = userProfile?.monthlyBudget || 5000;
  const displayBudget = isEditingBudget ? (parseInt(tempBudget) || 1) : monthlyBudget;
  const spendingPercentage = Math.min(Math.round((monthlySpending / displayBudget) * 100), 100);

  // Real-time balance change calculation
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthNet = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);
  
  const prevTotalBalance = totalBalance - currentMonthNet;
  const balanceChange = prevTotalBalance === 0 ? 0 : (currentMonthNet / Math.abs(prevTotalBalance)) * 100;

  const saveBudget = async () => {
    if (!user) return;
    setIsSavingBudget(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        monthlyBudget: parseInt(tempBudget) || 0
      }, { merge: true });
      setIsEditingBudget(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesTab = activeTab === 'All' || t.type.toLowerCase() === activeTab.toLowerCase();
    if (!matchesTab) return false;

    if (timeframe === 'All') return true;

    const txDate = new Date(t.date);
    const today = new Date();

    if (timeframe === 'Weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return txDate >= weekAgo;
    }

    if (timeframe === 'Monthly') {
      return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    }

    if (timeframe === 'Yearly') {
      return txDate.getFullYear() === today.getFullYear();
    }

    return true;
  });

  const addTransaction = async (e: FormEvent) => {
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
  <main className="px-4 sm:px-6 pt-8 pb-32 max-w-5xl mx-auto relative overflow-hidden">
    <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full h-96 aurora-glow pointer-events-none -z-10"></div>
    
    <header className="mb-8 sm:mb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Finance</h1>
          <p className="text-on-surface-variant font-body text-sm">Track your wealth</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-glow-primary active:scale-90 transition-all"
        >
          {showAdd ? <X size={24} className="sm:w-7 sm:h-7" /> : <Plus size={24} className="sm:w-7 sm:h-7" />}
        </button>
      </div>
    </header>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onSubmit={addTransaction}
        className="mb-10 p-6 sm:p-8 bg-surface-container-low rounded-[2rem] shadow-card space-y-4 sm:space-y-6 border border-outline-variant/10"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Merchant/Source</label>
            <input 
              type="text" 
              placeholder="e.g. Starbucks"
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-primary transition-all"
              value={newTx.merchant}
              onChange={e => setNewTx({...newTx, merchant: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Amount</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface focus:ring-2 ring-primary transition-all"
              value={newTx.amount}
              onChange={e => setNewTx({...newTx, amount: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Category</label>
            <select 
              className="w-full bg-surface-container-high border-none rounded-2xl p-4 sm:p-5 text-on-surface appearance-none"
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
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ml-1">Type</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setNewTx({...newTx, type: 'expense'})}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${newTx.type === 'expense' ? 'bg-error text-on-error shadow-lg shadow-error/20' : 'bg-surface-container-high text-on-surface'}`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => setNewTx({...newTx, type: 'income'})}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${newTx.type === 'income' ? 'bg-primary text-on-primary shadow-glow-primary' : 'bg-surface-container-high text-on-surface'}`}
              >
                Income
              </button>
            </div>
          </div>
        </div>
        <button type="submit" className="w-full py-4 sm:py-5 bg-primary text-on-primary rounded-2xl font-bold text-base sm:text-lg shadow-glow-primary active:scale-95 transition-all">Add Transaction</button>
      </motion.form>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div className="bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-card transition-all duration-300 border border-outline-variant/5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Total Balance</span>
            <h3 className="text-4xl font-black text-on-surface mt-1">{currency}{totalBalance.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Wallet size={24} />
          </div>
        </div>
        <div className="mt-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${balanceChange >= 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
            {balanceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(1)}% this month
          </div>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] p-8 flex flex-col justify-between min-h-[220px] shadow-card relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Monthly Spending</span>
            <h3 className="text-4xl font-black text-on-surface mt-1">{currency}{monthlySpending.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
            <ShoppingCart size={24} />
          </div>
        </div>
        
        <div className="relative z-10 mt-6">
          <div className="w-full bg-surface-container-highest h-4 rounded-full overflow-hidden p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${spendingPercentage}%` }}
              className="bg-primary h-full rounded-full shadow-glow-primary"
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {spendingPercentage}% of {currency}{displayBudget.toLocaleString()}
            </span>
            {isEditingBudget ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  className="w-24 bg-surface-container-high border-none rounded-lg px-3 py-1 text-xs font-bold"
                  value={tempBudget}
                  onChange={e => setTempBudget(e.target.value)}
                  autoFocus
                />
                <button onClick={saveBudget} className="text-primary text-[10px] font-black uppercase tracking-widest">Save</button>
              </div>
            ) : (
              <button 
                onClick={() => { setTempBudget(monthlyBudget.toString()); setIsEditingBudget(true); }}
                className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Edit Budget
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    <section className="mb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <h3 className="font-headline text-2xl font-bold">Transactions</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-2xl shadow-inner border border-outline-variant/10">
            {['All', 'Weekly', 'Monthly'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest transition-all relative ${
                  timeframe === tf ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="relative z-10">{tf}</span>
                {timeframe === tf && (
                  <motion.div 
                    layoutId="financeTimeframe"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex bg-surface-container-low p-1 rounded-2xl shadow-inner border border-outline-variant/10">
            {['All', 'Income', 'Expense'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="relative z-10">{tab}</span>
                {activeTab === tab && (
                  <motion.div 
                    layoutId="financeTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredTransactions.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="py-20 text-center opacity-50"
            >
              <CreditCard size={48} className="mx-auto mb-4" />
              <p>No transactions found.</p>
            </motion.div>
          )}
          {filteredTransactions.map(tx => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={tx.id} 
              className="flex items-center justify-between p-6 bg-surface-container-low rounded-[2rem] border border-outline-variant/5 hover:shadow-card transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                  tx.type === 'income' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                }`}>
                  {tx.category === 'Dining' && <Utensils size={24} />}
                  {tx.category === 'Income' && <TrendingUp size={24} />}
                  {tx.category === 'Bills' && <Zap size={24} />}
                  {tx.category === 'Shopping' && <ShoppingCart size={24} />}
                  {tx.category === 'Transport' && <Activity size={24} />}
                </div>
                <div>
                  <p className="font-bold text-lg text-on-surface leading-tight">{tx.merchant}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{tx.category}</span>
                    <span className="text-on-surface-variant/40">•</span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      {new Date(tx.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-xl font-black ${tx.type === 'income' ? 'text-tertiary' : 'text-on-surface'}`}>
                    {tx.type === 'income' ? '+' : '-'}{currency}{Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{tx.time}</p>
                </div>
                <button 
                  onClick={() => deleteTransaction(tx.id)}
                  className="p-3 text-error/40 hover:text-error hover:bg-error/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
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
  const [editBudget, setEditBudget] = useState(userProfile?.monthlyBudget || 5000);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biometricEnabled') === 'true';
    }
    return false;
  });

  const handleToggleBiometrics = async () => {
    if (biometricsEnabled) {
      localStorage.removeItem('biometricEnabled');
      setBiometricsEnabled(false);
    } else {
      try {
        await registerBiometric(userProfile?.email || 'user@lifeos.app', userProfile?.uid || 'user123');
        localStorage.setItem('biometricEnabled', 'true');
        setBiometricsEnabled(true);
      } catch (error) {
        console.error("Biometric registration failed:", error);
        console.warn("Simulating biometric registration for preview environment.");
        localStorage.setItem('biometricEnabled', 'true');
        setBiometricsEnabled(true);
      }
    }
  };

  useEffect(() => {
    setEditName(userProfile?.displayName || '');
    setEditEmail(userProfile?.email || '');
    setHideEmail(userProfile?.hideEmail || false);
    setEditPhone(userProfile?.phone || '');
    setEditPhotoUrl(userProfile?.photoURL || '');
    setEditBudget(userProfile?.monthlyBudget || 5000);
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: editName,
        email: editEmail,
        hideEmail: hideEmail,
        phone: editPhone,
        photoURL: editPhotoUrl,
        monthlyBudget: editBudget
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
            <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-3xl border border-primary/10">
              <Zap className="text-primary" size={32} />
              <div>
                <h4 className="font-headline font-bold text-lg">LifeOS Ultra</h4>
                <p className="text-sm text-on-surface-variant">Active since Oct 12, 2023</p>
              </div>
            </div>
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Plan Benefits</h5>
              <ul className="space-y-3">
                {['Unlimited AI Insights', 'Cross-device Sync', 'Priority Support', 'Custom Themes'].map((b, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 size={18} className="text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <button className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-glow-primary">Upgrade to Family</button>
              <button className="w-full py-5 bg-surface-container-high text-error rounded-2xl font-black uppercase tracking-widest">Cancel Subscription</button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Display Mode</h5>
              <div className="grid grid-cols-2 gap-4">
                {['dark', 'light'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setTheme(m)}
                    className={`p-5 rounded-2xl border-2 transition-all ${theme === m ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/20 text-on-surface'} text-xs font-black uppercase tracking-widest`}
                  >
                    {m} Mode
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Theme Selection</h5>
              <div className="grid grid-cols-5 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${
                      theme === t.id ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full border-2 border-surface shadow-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-[0.6rem] font-black uppercase tracking-tighter text-on-surface-variant group-hover:text-on-surface">
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
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Full Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-surface-container-high border-none rounded-2xl p-5 text-on-surface focus:ring-2 ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email Address</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-surface-container-high border-none rounded-2xl p-5 text-on-surface focus:ring-2 ring-primary" />
            </div>
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Hide Email in Profile</span>
              <button onClick={() => setHideEmail(!hideEmail)} className={`w-12 h-6 rounded-full transition-all relative ${hideEmail ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${hideEmail ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Phone Number</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-surface-container-high border-none rounded-2xl p-5 text-on-surface focus:ring-2 ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Monthly Budget ({currency})</label>
              <input type="number" value={editBudget} onChange={(e) => setEditBudget(parseInt(e.target.value) || 0)} className="w-full bg-surface-container-high border-none rounded-2xl p-5 text-on-surface focus:ring-2 ring-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Profile Picture</label>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] overflow-hidden bg-surface-container-high border-2 border-outline-variant/20 flex items-center justify-center shadow-inner">
                  {editPhotoUrl ? <img src={editPhotoUrl} className="w-full h-full object-cover" /> : <User size={32} className="text-on-surface-variant" />}
                </div>
                <label className="px-6 py-3 bg-surface-container-high border border-outline-variant/20 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-surface-container-highest transition-all">
                  Change Photo
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
            <button onClick={handleSaveProfile} className="w-full py-5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-glow-primary mt-4">Save Changes</button>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-surface-container-high rounded-[2rem] border border-outline-variant/10">
              <div>
                <h5 className="font-black text-sm uppercase tracking-widest">Push Notifications</h5>
                <p className="text-[10px] text-on-surface-variant font-medium mt-1">Receive alerts and reminders</p>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)} 
                className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-surface-container-high rounded-[2rem] border border-outline-variant/10">
              <div>
                <h5 className="font-black text-sm uppercase tracking-widest">Biometric Login</h5>
                <p className="text-[10px] text-on-surface-variant font-medium mt-1">Use Face ID / Touch ID</p>
              </div>
              <button 
                onClick={handleToggleBiometrics} 
                className={`w-12 h-6 rounded-full transition-all relative ${biometricsEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${biometricsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        );
      case 'app_prefs':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Currency Symbol</h5>
              <div className="grid grid-cols-4 gap-3">
                {['$', '€', '£', '₹'].map(c => (
                  <button 
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`py-4 rounded-2xl font-black text-xl transition-all ${currency === c ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20' : 'bg-surface-container-high text-on-surface'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="w-20 h-20 rounded-[2.5rem] bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
              <Settings size={40} />
            </div>
            <div>
              <h4 className="font-headline font-black text-2xl tracking-tight">Coming Soon</h4>
              <p className="text-on-surface-variant font-medium max-w-[240px] mx-auto text-sm">We're working on bringing more control to your LifeOS experience.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="px-4 sm:px-6 pt-12 pb-40 max-w-5xl mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full aurora-glow opacity-20 pointer-events-none -z-10"></div>
      
      <header className="mb-8 sm:mb-12">
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Settings</h1>
        <p className="text-on-surface-variant font-body text-sm">Personalize your LifeOS experience</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="md:col-span-2 bg-surface-container-low rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-sm border border-outline-variant/5"
        >
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-surface shadow-card">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={32} className="text-primary sm:w-10 sm:h-10" />
              )}
            </div>
            <button 
              onClick={() => setActiveModal('edit_profile')}
              className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-primary text-on-primary rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow-primary border-4 border-surface"
            >
              <Edit2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-on-surface">{userProfile?.displayName || 'LifeOS User'}</h2>
            {!userProfile?.hideEmail && <p className="text-on-surface-variant font-medium text-sm">{userProfile?.email || 'No email set'}</p>}
            <div className="flex justify-center sm:justify-start gap-2 mt-4">
              <span className="px-3 py-1 bg-tertiary/10 text-tertiary rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Premium Plan</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Active</span>
            </div>
          </div>
        </motion.div>

        {/* Theme Card */}
        <div className="bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm border border-outline-variant/5">
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Appearance</span>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setTheme('light')}
              className={`flex-1 aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-primary text-on-primary shadow-glow-primary' : 'bg-surface-container-high text-on-surface'}`}
            >
              <Sun size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Light</span>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex-1 aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-primary text-on-primary shadow-glow-primary' : 'bg-surface-container-high text-on-surface'}`}
            >
              <Moon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dark</span>
            </button>
          </div>
        </div>

        {/* Preferences Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {preferences.map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveModal(item.id)}
              className="bg-surface-container-low p-6 rounded-[2rem] flex items-center gap-4 cursor-pointer border border-outline-variant/5 hover:shadow-card transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <item.icon size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-on-surface uppercase tracking-widest">{item.label}</h4>
                <p className="text-[10px] text-on-surface-variant font-medium">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Budget Card */}
        <div className="bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm border border-outline-variant/5">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Monthly Budget</span>
            <button onClick={() => setActiveModal('edit_profile')} className="text-primary"><Edit2 size={16} /></button>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-on-surface">{currency}{userProfile?.monthlyBudget?.toLocaleString() || '5,000'}</h3>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Target spending limit</p>
          </div>
        </div>

        {/* Sign Out Card */}
        <button 
          onClick={() => signOut(auth)}
          className="md:col-span-3 bg-error/10 hover:bg-error/20 rounded-[2.5rem] p-8 flex items-center justify-center gap-3 transition-all group"
        >
          <LogOut className="text-error group-hover:scale-110 transition-transform" size={24} />
          <span className="text-error font-black uppercase tracking-[0.3em] text-sm">Sign Out of LifeOS</span>
        </button>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-surface-dim/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-low rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border border-outline-variant/10 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl sm:text-3xl font-black text-on-surface capitalize tracking-tight">{activeModal.replace('_', ' ')}</h3>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors"><X size={24} /></button>
              </div>
              {renderModalContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

const Onboarding = ({ onFinish, authError, currency }: { onFinish: (mode?: 'signin' | 'signup') => void | Promise<void>, authError: string | null, currency: string }) => {
  const [step, setStep] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
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
      desc: "Organize your day and prioritize what matters most.",
      content: (
        <div className="w-full relative space-y-3">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <Zap className="text-primary-container" size={20} />
              <span className="text-lg font-headline text-on-surface">Daily Focus</span>
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
          disabled={isSigningIn}
          onClick={async () => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              setIsSigningIn(true);
              await onFinish();
              setIsSigningIn(false);
            }
          }}
          className={`w-full py-5 px-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg shadow-[0_10px_30px_rgba(77,166,255,0.2)] transition-all duration-200 ${isSigningIn ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {isSigningIn ? 'Signing In...' : current.button}
        </button>
        <div className="flex flex-col items-center gap-4">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="text-on-surface-variant font-body font-semibold flex items-center gap-2">
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <button 
            onClick={() => {
              onFinish('signin'); // This will trigger the auth screen in signin mode
            }} 
            className="text-primary font-body font-bold text-sm"
          >
            Already have an account? Sign In
          </button>
        </div>
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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currency, setCurrency] = useState('$');
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biometricEnabled') === 'true';
    }
    return false;
  });

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
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
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (firebaseUser) {
        // Automatically create user profile if it doesn't exist
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          try {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'New User',
              photoURL: firebaseUser.photoURL || '',
              theme: 'dark',
              streak: 0,
              productivityScore: 0,
              plan: 'Free',
              createdAt: new Date().toISOString(),
              role: 'user',
              monthlyBudget: 5000,
              hideEmail: false
            });
          } catch (error) {
            console.error("Error creating user profile:", error);
          }
        }
        setScreen('dashboard');
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

    return () => {
      unsubUser();
      unsubTasks();
      unsubHabits();
      unsubGoals();
      unsubTransactions();
    };
  }, [user]);

  const handleOnboardingFinish = async (mode: 'signin' | 'signup' = 'signup') => {
    setAuthMode(mode);
    setScreen('auth');
  };

  if (!isAuthReady) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="aurora-glow absolute inset-0 opacity-20"></div>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high shadow-2xl border border-outline-variant/20 flex items-center justify-center">
            <Zap className="text-primary" size={32} />
          </div>
          <p className="font-label uppercase tracking-widest text-xs font-bold text-on-surface-variant">Initializing LifeOS...</p>
        </div>
      </div>
    );
  }

  if (user && isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (!user && !isInitialized && screen === 'onboarding') {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 aurora-glow pointer-events-none"></div>
        <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-8 text-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary-container/20 blur-3xl rounded-full"></div>
            <div className="relative flex items-center justify-center w-32 h-32 rounded-xl bg-surface-container-high shadow-2xl border border-outline-variant/20">
              <Zap className="text-primary-container" size={64} fill="currentColor" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="font-headline font-bold text-5xl tracking-tighter text-on-surface">LifeOS</h1>
            <p className="font-body text-on-surface-variant text-lg tracking-wide max-w-xs mx-auto opacity-80">Control Your Life</p>
          </div>
          <div className="mt-24 flex flex-col items-center gap-6">
            <button 
              onClick={() => setIsInitialized(true)}
              className="group relative px-8 py-4 bg-surface-container-low hover:bg-surface-container-high transition-all duration-300 rounded-full border border-outline-variant/10 flex items-center gap-3"
            >
              <span className="font-label uppercase tracking-widest text-[0.6875rem] font-semibold text-on-surface-variant group-hover:text-primary transition-colors">Initializing Core</span>
              <ArrowRight className="text-primary transition-transform group-hover:translate-x-1" size={16} />
            </button>
            <button 
              onClick={() => {
                setIsInitialized(true);
                setScreen('auth');
                setAuthMode('signin');
              }}
              className="text-on-surface-variant hover:text-primary transition-colors font-label uppercase tracking-widest text-[0.6875rem] font-semibold"
            >
              Already have an account? Sign In
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user && isInitialized) {
    if (screen === 'auth') {
      return authMode === 'signin' ? <SignIn onNavigate={(path) => { if (path === '/signup') setAuthMode('signup'); else setScreen('dashboard'); }} /> : <SignUp onNavigate={(path) => { if (path === '/signin') setAuthMode('signin'); else setScreen('dashboard'); }} />;
    }
    return <Onboarding onFinish={handleOnboardingFinish} authError={authError} currency={currency} />;
  }

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding': return <Onboarding onFinish={handleOnboardingFinish} authError={authError} currency={currency} />;
      case 'auth': return authMode === 'signin' ? <SignIn onNavigate={(path) => { if (path === '/signup') setAuthMode('signup'); else setScreen('dashboard'); }} /> : <SignUp onNavigate={(path) => { if (path === '/signin') setAuthMode('signin'); else setScreen('dashboard'); }} />;
      case 'dashboard': return <Dashboard setScreen={setScreen} tasks={tasks} habits={habits} goals={goals} transactions={transactions} userProfile={userProfile} productivityScore={productivityScore} currency={currency} />;
      case 'tasks': return <TasksScreen tasks={tasks} user={user} />;
      case 'habits': return <HabitsScreen habits={habits} user={user} />;
      case 'goals': return <GoalsScreen goals={goals} user={user} />;
      case 'finance': return <FinanceScreen transactions={transactions} user={user} currency={currency} userProfile={userProfile} />;
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
    profile: 'Profile'
  };

  return (
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
          <BottomNav currentScreen={screen} setScreen={setScreen} />
        </>
      )}
    </div>
  );
}
