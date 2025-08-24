import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Package,
  User,
  Phone,
  Navigation
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTodaySchedule,
  getActiveTimeLog,
  startTimeTracking,
  stopTimeTracking,
  getTimeLogStats,
  getCurrentLocation,
  getMockWeatherData,
  formatDuration,
  type TimeLogWithRelations
} from '../lib/timeLogs';
import { getUserProfiles } from '../lib/database';
import { formatCurrency, formatTime } from '../lib/database';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';

function WorkerDashboard() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [activeTimeLog, setActiveTimeLog] = useState<TimeLogWithRelations | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update elapsed time if actively tracking
      if (activeTimeLog?.start_time) {
        const start = new Date(activeTimeLog.start_time);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTimeLog]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile) {
        setError('Användarprofil hittades inte');
        return;
      }

      setUserProfile(profile);

      // Load dashboard data
      const [scheduleResult, activeLogResult, statsResult] = await Promise.all([
        getTodaySchedule(user.id),
        getActiveTimeLog(user.id),
        getTimeLogStats(user.id, getWeekStart(), getWeekEnd())
      ]);

      if (scheduleResult.error) {
        setError(scheduleResult.error.message);
        return;
      }

      if (activeLogResult.error) {
        setError(activeLogResult.error.message);
        return;
      }

      if (statsResult.error) {
        setError(statsResult.error.message);
        return;
      }

      setTodaySchedule(scheduleResult.data || []);
      setActiveTimeLog(activeLogResult.data);
      setStats(statsResult.data);

      // Load weather data
      const location = await getCurrentLocation();
      const weatherData = await getMockWeatherData(location?.lat, location?.lng);
      setWeather(weatherData);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Ett oväntat fel inträffade vid laddning av dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const getWeekEnd = () => {
    const weekStart = new Date(getWeekStart());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd.toISOString().split('T')[0];
  };

  const handleStartTracking = async (orderId: string, workType?: string) => {
    try {
      const location = await getCurrentLocation();
      const weatherData = await getMockWeatherData(location?.lat, location?.lng);
      
      const result = await startTimeTracking(
        orderId,
        user!.id,
        workType,
        location,
        `${weatherData.temperature}°C, ${weatherData.condition}`
      );

      if (result.error) {
        showError('Kunde inte starta tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(result.data as TimeLogWithRelations);
      success('Tidtagning startad!');
    } catch (err) {
      console.error('Error starting time tracking:', err);
      showError('Ett fel inträffade vid start av tidtagning');
    }
  };

  const handleStopTracking = async (notes?: string, breakDuration: number = 0) => {
    if (!activeTimeLog) return;

    try {
      const result = await stopTimeTracking(
        activeTimeLog.id,
        breakDuration,
        notes
      );

      if (result.error) {
        showError('Kunde inte stoppa tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(null);
      success('Tidtagning stoppad och sparad!');
      
      // Reload stats
      const statsResult = await getTimeLogStats(user!.id, getWeekStart(), getWeekEnd());
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error('Error stopping time tracking:', err);
      showError('Ett fel inträffade vid stopp av tidtagning');
    }
  };

  const getNextEvent = () => {
    const now = new Date();
    return todaySchedule.find(event => {
      if (!event.start_time) return false;
      return new Date(event.start_time) > now;
    });
  };

  const getCurrentEvent = () => {
    const now = new Date();
    return todaySchedule.find(event => {
      if (!event.start_time || !event.end_time) return false;
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      return start <= now && now <= end;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Laddar din arbetsplats..." />
      </div>
    );
  }

  const nextEvent = getNextEvent();
  const currentEvent = getCurrentEvent();

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hej {userProfile?.full_name?.split(' ')[0] || 'Medarbetare'}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              {currentTime.toLocaleDateString('sv-SE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {currentTime.toLocaleTimeString('sv-SE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <p className="text-sm text-gray-500">Aktuell tid</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Time Tracking */}
          {activeTimeLog ? (
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Play className="w-6 h-6 mr-2" />
                  Aktiv tidtagning
                </h2>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatDuration(elapsedTime)}
                  </div>
                  <p className="text-green-100 text-sm">Arbetstid</p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">{activeTimeLog.order?.title}</h3>
                <p className="text-green-100 text-sm">
                  Kund: {activeTimeLog.order?.customer?.name}
                </p>
                <p className="text-green-100 text-sm">
                  Startad: {new Date(activeTimeLog.start_time).toLocaleTimeString('sv-SE')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleStopTracking()}
                  className="flex-1 bg-white text-green-600 px-4 py-3 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center justify-center"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stoppa tidtagning
                </button>
              </div>
            </div>
          ) : currentEvent ? (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Pågående uppdrag</h2>
                <Clock className="w-6 h-6" />
              </div>
              
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">{currentEvent.title}</h3>
                <p className="text-blue-100 text-sm">
                  {currentEvent.related_order?.customer?.name}
                </p>
                <p className="text-blue-100 text-sm">
                  {new Date(currentEvent.start_time).toLocaleTimeString('sv-SE')} - 
                  {new Date(currentEvent.end_time).toLocaleTimeString('sv-SE')}
                </p>
              </div>

              <button
                onClick={() => handleStartTracking(currentEvent.related_order_id, currentEvent.title)}
                className="w-full bg-white text-blue-600 px-4 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Starta tidtagning
              </button>
            </div>
          ) : nextEvent ? (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Nästa uppdrag</h2>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{nextEvent.title}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {nextEvent.related_order?.customer?.name}
                  </p>
                  <p className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {new Date(nextEvent.start_time).toLocaleTimeString('sv-SE')}
                  </p>
                  {nextEvent.related_order?.customer?.address && (
                    <p className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {nextEvent.related_order.customer.address}
                    </p>
                  )}
                  {nextEvent.related_order?.customer?.phone_number && (
                    <p className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {nextEvent.related_order.customer.phone_number}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Inga uppdrag idag</h3>
                <p className="text-gray-600">Du har inga schemalagda uppdrag för idag. Vila eller kontakta din chef.</p>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Dagens schema
              </h2>
            </div>
            
            <div className="p-6">
              {todaySchedule.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Inga schemalagda uppdrag idag</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySchedule.map((event) => {
                    const isActive = currentEvent?.id === event.id;
                    const isPast = event.end_time && new Date(event.end_time) < new Date();
                    
                    return (
                      <div
                        key={event.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isActive 
                            ? 'border-blue-500 bg-blue-50' 
                            : isPast 
                            ? 'border-gray-200 bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">{event.title}</h3>
                              {isActive && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  Pågår nu
                                </span>
                              )}
                              {isPast && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                {event.related_order?.customer?.name}
                              </p>
                              <p className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {new Date(event.start_time).toLocaleTimeString('sv-SE')} - 
                                {event.end_time && new Date(event.end_time).toLocaleTimeString('sv-SE')}
                              </p>
                              {event.related_order?.customer?.address && (
                                <p className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  {event.related_order.customer.address}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2">
                            {!activeTimeLog && !isPast && (
                              <button
                                onClick={() => handleStartTracking(event.related_order_id, event.title)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Starta
                              </button>
                            )}
                            {event.related_order?.customer?.phone_number && (
                              <a
                                href={`tel:${event.related_order.customer.phone_number}`}
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Ring
                              </a>
                            )}
                            {event.related_order?.customer?.address && (
                              <a
                                href={`https://maps.google.com/maps?q=${encodeURIComponent(event.related_order.customer.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center"
                              >
                                <Navigation className="w-4 h-4 mr-1" />
                                Karta
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Weather Widget */}
          {weather && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Thermometer className="w-5 h-5 mr-2 text-blue-600" />
                Väder idag
              </h3>
              
              <div className="text-center">
                <div className="text-4xl mb-2">{weather.icon}</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {weather.temperature}°C
                </div>
                <p className="text-gray-600 mb-4">{weather.condition}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-center space-x-1">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span>{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <Wind className="w-4 h-4 text-gray-500" />
                    <span>{weather.windSpeed} m/s</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Stats */}
          {stats && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Denna vecka
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Totala timmar</span>
                  <span className="font-bold text-gray-900">{stats.totalHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Godkända timmar</span>
                  <span className="font-bold text-green-600">{stats.approvedHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Väntar godkännande</span>
                  <span className="font-bold text-orange-600">{stats.pendingHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Antal uppdrag</span>
                  <span className="font-bold text-gray-900">{stats.ordersWorked}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Beräknad lön</span>
                  <span className="font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Snabbåtgärder</h3>
            
            <div className="space-y-3">
              <a
                href="/worker-timesheet"
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Clock className="w-5 h-5 mr-2" />
                Visa tidrapport
              </a>
              
              <a
                href="/worker-schedule"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Mitt schema
              </a>
              
              <a
                href="/installningar"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <User className="w-5 h-5 mr-2" />
                Min profil
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerDashboard;