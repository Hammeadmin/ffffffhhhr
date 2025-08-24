import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  X,
  Users, 
  Briefcase, 
  Receipt, 
  Plus, 
  Calendar,
  FileText,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertCircle,
  RefreshCw,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Zap,
  Target,
  MapPin,
  Timer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import FloatingActionButton from '../components/FloatingActionButton';
import { 
  getKPIData,
  getSalesDataByMonth,
  getLeadStatusDistribution,
  getJobStatusDistribution,
  getRecentActivity,
  formatCurrency,
  formatDate 
} from '../lib/database';

const capitalize = (s) => {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface KPIData {
  totalSales: number;
  activeLeads: number;
  activeJobs: number;
  overdueInvoices: number;
  error?: string | null;
}

interface ActivityItem {
  id: string;
  type: 'lead' | 'quote' | 'job' | 'invoice';
  title: string;
  subtitle: string;
  time: string;
  status: string;
  user?: string;
}

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// Activity Detail Modal Component
function ActivityDetailModal({ activity, isOpen, onClose }: ActivityDetailModalProps) {
  if (!isOpen || !activity) return null;

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'lead': return 'Lead';
      case 'quote': return 'Offert';
      case 'job': return 'Jobb';
      case 'invoice': return 'Faktura';
      default: return type;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead': return TrendingUp;
      case 'quote': return FileText;
      case 'job': return Briefcase;
      case 'invoice': return Receipt;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lead': return 'from-blue-500 to-blue-600';
      case 'quote': return 'from-purple-500 to-purple-600';
      case 'job': return 'from-orange-500 to-orange-600';
      case 'invoice': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getSwedishStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'new': 'Ny',
      'contacted': 'Kontaktad',
      'qualified': 'Kvalificerad',
      'won': 'Vunnen',
      'lost': 'Förlorad',
      'draft': 'Utkast',
      'sent': 'Skickad',
      'accepted': 'Accepterad',
      'declined': 'Avvisad',
      'pending': 'Väntande',
      'in_progress': 'Pågående',
      'completed': 'Slutförd',
      'invoiced': 'Fakturerad',
      'paid': 'Betald',
      'overdue': 'Förfallen'
    };
    return statusLabels[status] || status;
  };

  const getFullSwedishTime = (timeString: string) => {
    const date = new Date(timeString);
    return new Intl.DateTimeFormat('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    }).format(date);
  };

  const Icon = getActivityIcon(activity.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-scale-in">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getActivityColor(activity.type)} p-6 rounded-t-2xl relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white font-primary">{activity.title}</h2>
                <p className="text-white/80 font-secondary">{getActivityTypeLabel(activity.type)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white hover:bg-white/20 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Time Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Status</label>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  activity.status === 'won' || activity.status === 'accepted' || activity.status === 'completed' || activity.status === 'paid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : activity.status === 'lost' || activity.status === 'declined' || activity.status === 'overdue'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : activity.status === 'in_progress' || activity.status === 'sent'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  {getSwedishStatusLabel(activity.status)}
                </div>
              </div>

              {activity.user && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Ansvarig</label>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                      {activity.user.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{activity.user}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Tidpunkt</label>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{getFullSwedishTime(activity.time)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Aktivitets-ID</label>
                <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {activity.id}
                </code>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Beskrivning</label>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{activity.subtitle}</p>
            </div>
          </div>

          {/* Mock Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Relaterad information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">Prioritet:</span>
                  <span className="text-blue-900 dark:text-blue-300 font-medium">Hög</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">Kategori:</span>
                  <span className="text-blue-900 dark:text-blue-300 font-medium">Försäljning</span>
                </div>
                {activity.type === 'job' && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-400">Framsteg:</span>
                    <span className="text-blue-900 dark:text-blue-300 font-medium">65%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-gray-300 mb-2">Snabbåtgärder</h4>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                  Visa fullständiga detaljer
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                  Redigera {getActivityTypeLabel(activity.type).toLowerCase()}
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200">
                  Lägg till anteckning
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Senast uppdaterad: {getFullSwedishTime(activity.time)}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Stäng
            </button>
            <button
              onClick={() => {
                const routes = {
                  lead: '/leads',
                  quote: '/offerter',
                  job: '/jobb',
                  invoice: '/fakturor'
                };
                window.location.href = routes[activity.type as keyof typeof routes] || '/';
              }}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Visa i {getActivityTypeLabel(activity.type)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '', formatter }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * end);
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  const displayValue = formatter ? formatter(count) : count;
  return <span>{prefix}{displayValue}{suffix}</span>;
}

// Weather Widget Component
function WeatherWidget() {
  const [weather] = useState({
    city: 'Stockholm',
    temperature: 8,
    condition: 'Molnigt',
    humidity: 72,
    windSpeed: 12,
    icon: Cloud
  });

  const Icon = weather.icon;

 return (
    // Replaced 'glass-medium' with theme-aware background, border, and shadow
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Updated icon and text colors to be visible in light/dark mode */}
          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-800 dark:text-gray-200 font-medium">
            {weather.city}
          </span>
        </div>
        <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Thermometer className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {weather.temperature}°C
          </span>
        </div>
        <div className="text-gray-600 dark:text-gray-400 text-xs text-right">
          <div className="flex items-center justify-end mb-1">
            <Wind className="w-3 h-3 mr-1.5" />
            {weather.windSpeed} m/s
          </div>
          <div>Luftfuktighet: {weather.humidity}%</div>
        </div>
      </div>
    </div>
  );
}

// Mini Sparkline Component
function MiniSparkline({ data, color = '#2563EB' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [kpiData, setKpiData] = useState<KPIData>({
    totalSales: 0,
    activeLeads: 0,
    activeJobs: 0,
    overdueInvoices: 0,
    error: null
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [leadStatusData, setLeadStatusData] = useState<any[]>([]);
  const [jobStatusData, setJobStatusData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all dashboard data in parallel
      const [
        kpiResult,
        salesByMonth,
        leadDistribution,
        jobDistribution,
        activityData
      ] = await Promise.all([
        getKPIData(DEMO_ORG_ID),
        getSalesDataByMonth(DEMO_ORG_ID, 6),
        getLeadStatusDistribution(DEMO_ORG_ID),
        getJobStatusDistribution(DEMO_ORG_ID),
        getRecentActivity(DEMO_ORG_ID, 8)
      ]);
      
      if (kpiResult.error) {
        setError(kpiResult.error);
        return;
      }
      
      setKpiData(kpiResult);
      setSalesData(salesByMonth);
      setLeadStatusData(leadDistribution);
      setJobStatusData(jobDistribution);
      setRecentActivity(activityData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Kunde inte ladda dashboard-data. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  if (user) {
      // Call both functions when the user is available
      loadUserProfile();
      loadDashboardData();
    }
  }, [user]); // The dependency array ensures this runs when 'user' changes
  

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userProfile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Användare';
    
    if (hour < 12) {
      return `God morgon, ${name}!`;
    } else if (hour < 17) {
      return `God eftermiddag, ${name}!`;
    } else {
      return `God kväll, ${name}!`;
    }
  };

  const getSwedishGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 10) return 'God morgon';
    if (hour < 17) return 'God dag';
    if (hour > 20) return 'God kväll';
    
  };

    const getSwedishTime = () => {
    // 1. Get each part of the date individually.
    const weekday = capitalize(currentTime.toLocaleString('sv-SE', { weekday: 'long', timeZone: 'Europe/Stockholm' }));
    const day = currentTime.getDate();
    const month = capitalize(currentTime.toLocaleString('sv-SE', { month: 'long', timeZone: 'Europe/Stockholm' }));
    const year = currentTime.getFullYear();
    const time = currentTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });

    // 2. Combine them into the final string.
    return `${weekday} ${day} ${month} ${year} ${time}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead': return TrendingUp;
      case 'quote': return FileText;
      case 'job': return Briefcase;
      case 'invoice': return Receipt;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string, status: string) => {
    switch (type) {
      case 'lead':
        if (status === 'won') return 'text-green-600 bg-green-100';
        if (status === 'lost') return 'text-red-600 bg-red-100';
        return 'text-blue-600 bg-blue-100';
      case 'quote':
        if (status === 'accepted') return 'text-green-600 bg-green-100';
        if (status === 'declined') return 'text-red-600 bg-red-100';
        return 'text-purple-600 bg-purple-100';
      case 'job':
        if (status === 'completed') return 'text-green-600 bg-green-100';
        if (status === 'in_progress') return 'text-blue-600 bg-blue-100';
        return 'text-orange-600 bg-orange-100';
      case 'invoice':
        if (status === 'paid') return 'text-green-600 bg-green-100';
        if (status === 'overdue') return 'text-red-600 bg-red-100';
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRelativeTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just nu';
    if (diffInMinutes < 60) return `för ${diffInMinutes} minuter sedan`;
    if (diffInMinutes < 1440) return `för ${Math.floor(diffInMinutes / 60)} timmar sedan`;
    return `för ${Math.floor(diffInMinutes / 1440)} dagar sedan`;
  };

  const getSwedishRelativeTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just nu';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return `${Math.floor(diffInMinutes / 10080)}v`;
  };

  const getSwedishStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'new': 'Ny',
      'contacted': 'Kontaktad',
      'qualified': 'Kvalificerad',
      'won': 'Vunnen',
      'lost': 'Förlorad',
      'draft': 'Utkast',
      'sent': 'Skickad',
      'accepted': 'Accepterad',
      'declined': 'Avvisad',
      'pending': 'Väntande',
      'in_progress': 'Pågående',
      'completed': 'Slutförd',
      'invoiced': 'Fakturerad',
      'paid': 'Betald',
      'overdue': 'Förfallen'
    };
    return statusLabels[status] || status;
  };

  const handleActivityClick = (activity: ActivityItem) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const closeActivityModal = () => {
    setSelectedActivity(null);
    setShowActivityModal(false);
  };

  // Calculate percentage changes (mock data for demo)
  const getPercentageChange = (current: number, type: string) => {
    const changes = {
      totalSales: 12,
      activeLeads: 8,
      activeJobs: 5,
      overdueInvoices: -15
    };
    return changes[type as keyof typeof changes] || 0;
  };

  // Generate sparkline data
  const generateSparklineData = (baseValue: number) => {
    return Array.from({ length: 7 }, () => 
      baseValue + (Math.random() - 0.5) * baseValue * 0.3
    );
  };

  const kpiCards = [
    {
      name: 'Total Försäljning',
      subtitle: 'Summa av betalda fakturor',
      value: kpiData.totalSales,
      change: getPercentageChange(kpiData.totalSales, 'totalSales'),
      changeType: getPercentageChange(kpiData.totalSales, 'totalSales') >= 0 ? 'positive' as const : 'negative' as const,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      sparklineColor: '#10B981',
      formatter: (value: number) => formatCurrency(value)
    },
    {
      name: 'Aktiva Leads',
      subtitle: 'Leads som inte är vunna/förlorade',
      value: kpiData.activeLeads,
      change: getPercentageChange(kpiData.activeLeads, 'activeLeads'),
      changeType: getPercentageChange(kpiData.activeLeads, 'activeLeads') >= 0 ? 'positive' as const : 'negative' as const,
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-600',
      sparklineColor: '#3B82F6',
      formatter: (value: number) => value.toString()
    },
    {
      name: 'Pågående Jobb',
      subtitle: 'Jobb som pågår',
      value: kpiData.activeJobs,
      change: getPercentageChange(kpiData.activeJobs, 'activeJobs'),
      changeType: getPercentageChange(kpiData.activeJobs, 'activeJobs') >= 0 ? 'positive' as const : 'negative' as const,
      icon: Briefcase,
      color: 'from-purple-500 to-violet-600',
      sparklineColor: '#8B5CF6',
      formatter: (value: number) => value.toString()
    },
    {
      name: 'Förfallna Fakturor',
      subtitle: 'Fakturor som är förfallna',
      value: kpiData.overdueInvoices,
      change: getPercentageChange(kpiData.overdueInvoices, 'overdueInvoices'),
      changeType: getPercentageChange(kpiData.overdueInvoices, 'overdueInvoices') >= 0 ? 'negative' as const : 'positive' as const,
      icon: Receipt,
      color: 'from-red-500 to-rose-600',
      sparklineColor: '#EF4444',
      formatter: (value: number) => value.toString()
    }
  ];

  const quickActions = [
    { 
      name: 'Lägg till Lead', 
      description: 'Skapa en ny försäljningsmöjlighet',
      icon: TrendingUp, 
      color: 'from-blue-500 to-blue-600', 
      href: '/leads',
      shortcut: 'G + L'
    },
    { 
      name: 'Skapa Offert', 
      description: 'Generera en ny offert för kund',
      icon: FileText, 
      color: 'from-purple-500 to-purple-600', 
      href: '/offerter',
      shortcut: 'G + O'
    },
    { 
      name: 'Ny Faktura', 
      description: 'Skapa och skicka en faktura',
      icon: Receipt, 
      color: 'from-green-500 to-green-600', 
      href: '/fakturor',
      shortcut: 'G + F'
    },
    { 
      name: 'Boka Möte', 
      description: 'Schemalägg ett möte eller uppgift',
      icon: Calendar, 
      color: 'from-orange-500 to-orange-600', 
      href: '/kalender',
      shortcut: 'G + C'
    }
  ];

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Custom tooltip for Swedish formatting
   const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        // 1. Use a solid background for high contrast, matching your theme
        <div className="bg-white dark:bg-gray-900/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl p-3 shadow-lg">
          {/* 2. Change text color for the label */}
          <p className="text-gray-900 dark:text-white font-semibold mb-1">{label}</p>
          
          {payload.map((entry: any, index: number) => (
            // 3. Change text color for the data values
            <p key={index} className="text-gray-700 dark:text-gray-300 text-sm">
              {entry.name}: {entry.name === 'Försäljning' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: salesData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <RechartsBarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="försäljning" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.7}/>
              </linearGradient>
            </defs>
          </RechartsBarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="försäljning" 
              stroke="#3B82F6" 
              fill="url(#areaGradient)"
              strokeWidth={3}
            />
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        );
      default:
        return (
          <RechartsLineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="försäljning" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2, fill: '#FBBF24' }}
            />
          </RechartsLineChart>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Översikt av din verksamhet"
          icon={BarChart3}
        />
        <SkeletonLoader type="dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Översikt av din verksamhet"
          icon={BarChart3}
        />
        <EmptyState
          type="general"
          title="Kunde inte ladda dashboard"
          description={error}
          actionText="Försök igen"
          onAction={loadDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
{/* Hero Section - Styled to match your new theme */}
<div className="premium-card p-8 animate-fade-in">
  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between">
    
    {/* Greeting, Time, and Description */}
    <div className="mb-6 lg:mb-0">
      <h1 className="text-4xl lg:text-5xl font-bold ...">
  {getSwedishGreeting()},{" "}
  {userProfile?.full_name?.split(" ")[0] || // 1. Try to use the full name from the profile
    user?.email?.split("@")[0] || // 2. Fall back to the email
    "Användare"}
  ! 👋
</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 font-secondary flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        {getSwedishTime()}
      </p>
      <p className="mt-2 text-gray-500 dark:text-gray-500 font-secondary">
        Här är en översikt av din verksamhet idag
      </p>
    </div>
    
    {/* Actions on the right */}
    <div className="flex flex-col sm:flex-row gap-4">
      <WeatherWidget />
      <button
        onClick={loadDashboardData}
        className="inline-flex items-center justify-center px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        <RefreshCw className="w-5 h-5 mr-2" />
        Uppdatera
      </button>
    </div>

  </div>
</div>
     

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const sparklineData = generateSparklineData(card.value);
          
          return (
            <div 
              key={card.name} 
              className="premium-card p-6 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-right">
                    <MiniSparkline data={sparklineData} color={card.sparklineColor} />
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium font-secondary mb-1">{card.name}</p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs font-secondary mb-3">{card.subtitle}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white font-primary">
                    <AnimatedCounter 
                      end={card.value} 
                      formatter={card.formatter}
                      duration={1500 + index * 200}
                    />
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={`
                    inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                    ${card.changeType === 'positive' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }
                  `}>
                    {card.changeType === 'positive' ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(card.change)}%
                  </div>
                  <span className="text-gray-500 dark:text-gray-500 text-xs font-secondary">vs förra månaden</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        {/* Advanced Sales Chart */}
        <div className="lg:col-span-2 premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-primary">Försäljning över tid</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-secondary">Senaste 6 månaderna</p>
              </div>
              <div className="flex items-center space-x-2">
                {[
                  { type: 'line', icon: LineChart, label: 'Linje' },
                  { type: 'bar', icon: BarChart3, label: 'Stapel' },
                  { type: 'area', icon: PieChart, label: 'Område' }
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      onClick={() => setChartType(option.type as any)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        chartType === option.type
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={option.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                {renderChart()}
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-gray-500 dark:text-gray-600">
                <div className="text-center">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                  <p className="font-secondary">Ingen försäljningsdata tillgänglig</p>
                </div>
              </div>
            )}
        </div>

        {/* Lead Status Distribution (from Code #1) */}
        <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 font-primary">Lead-fördelning</h3>
            {leadStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {leadStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} st`, name]}
                    contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.8)', // dark:bg-gray-800 with opacity
                      border: '1px solid rgba(55, 65, 81, 1)', // dark:border-gray-600
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)',
                      color: 'white'
                    }}
                    cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} // gray-500 with opacity
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-xs">{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-600">
                <div className="text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                  <p className="font-secondary">Inga leads tillgängliga</p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        {/* Enhanced Activity Feed */}
        <div className="premium-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center font-primary">
              <Activity className="w-6 h-6 mr-3 text-green-500" />
              Senaste Aktiviteter
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Klicka på en aktivitet för att visa detaljer
            </p>
          </div>
          
          <div className="p-4">
            {recentActivity.length > 0 ? (
              <div className="relative max-h-96 overflow-y-auto pr-2">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-purple-800 dark:to-green-800"></div>
                
                <div className="space-y-6 relative">
                {recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  const colorClasses = getActivityColor(activity.type, activity.status);

                  return (
                    <div 
                      key={activity.id} 
                      className="group relative flex items-start space-x-4 cursor-pointer"
                      onClick={() => handleActivityClick(activity)}
                    >
                      {/* Timeline Node */}
                      <div className="relative z-10 flex-shrink-0">
                        {/* Status Dot */}
                        <div className={`absolute -left-2 top-3 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                          activity.status === 'won' || activity.status === 'accepted' || activity.status === 'completed' || activity.status === 'paid'
                            ? 'bg-green-500'
                            : activity.status === 'lost' || activity.status === 'declined' || activity.status === 'overdue'
                            ? 'bg-red-500'
                            : activity.status === 'in_progress' || activity.status === 'sent'
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                        } shadow-sm group-hover:scale-125 transition-transform duration-200`}></div>
                        
                        {/* User Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                          {activity.user ? activity.user.split(' ').map(n => n[0]).join('').toUpperCase() : 'S'}
                        </div>
                      
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      {/* Activity Content */}
                      <div className="flex-1 min-w-0 bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 group-hover:shadow-md transition-all duration-300 group-hover:scale-[1.02]">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses} group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                {activity.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {activity.user && `av ${activity.user}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                              {getSwedishRelativeTime(activity.time)}
                            </span>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              activity.status === 'won' || activity.status === 'accepted' || activity.status === 'completed' || activity.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : activity.status === 'lost' || activity.status === 'declined' || activity.status === 'overdue'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : activity.status === 'in_progress' || activity.status === 'sent'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {getSwedishStatusLabel(activity.status)}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {activity.subtitle}
                        </p>
                        
                        {/* Hover Action Hint */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <span>Klicka för att öppna detaljer</span>
                            <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Timeline End Indicator */}
                <div className="relative flex justify-center mt-6">
                  <div className="absolute left-8 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800"></div>
                  <span className="bg-white dark:bg-gray-800 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 ml-12">
                    Äldre aktiviteter
                          </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p className="font-secondary">Ingen aktivitet att visa</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="premium-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-primary">Snabbåtgärder</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-secondary mt-1">Vanliga uppgifter och genvägar</p>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.name}
                    onClick={() => window.location.href = action.href}
                    className="group w-full text-left bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 font-secondary">{action.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-secondary">{action.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <kbd className="px-2 py-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 rounded border border-gray-300 dark:border-gray-600">
                          {action.shortcut}
                        </kbd>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Job Status Overview */}
      {jobStatusData.length > 0 && (
        <div className="premium-card p-6 animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-primary flex items-center">
              <Briefcase className="w-6 h-6 mr-3 text-blue-500" />
              Jobb-status översikt
            </h3>
            <div className="text-gray-600 dark:text-gray-400 text-sm font-secondary">
              Totalt {jobStatusData.reduce((sum, item) => sum + item.antal, 0)} jobb
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={jobStatusData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="name" 
                className="stroke-gray-500 dark:stroke-gray-400" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis className="stroke-gray-500 dark:stroke-gray-400" fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}/>
              <Bar dataKey="antal" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Floating Action Button (from Code #1, restyled) */}
      <FloatingActionButton /> {/* Assuming you've moved the FAB to its own component as in Code #2 */}
      {/* If you haven't, you can keep the original FAB code here and adjust its colors */}

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={showActivityModal}
        onClose={closeActivityModal}
      />
    </div>
  );
}

export default Dashboard;