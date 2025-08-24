import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
  Package,
  User,
  MapPin,
  Camera,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getWeeklyTimesheet,
  getTimeLogs,
  updateTimeLog,
  submitTimesheet,
  formatDuration,
  type WeeklyTimesheet,
  type TimeLogWithRelations,
  type Material
} from '../lib/timeLogs';
import { formatCurrency, formatDate, formatTime } from '../lib/database';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../hooks/useToast';

function WorkerTimesheet() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekStart());
  const [timesheet, setTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [detailedLogs, setDetailedLogs] = useState<TimeLogWithRelations[]>([]);
  const [editingLog, setEditingLog] = useState<TimeLogWithRelations | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function getCurrentWeekStart(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (user) {
      loadTimesheetData();
    }
  }, [user, currentWeek]);

  const loadTimesheetData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Load weekly timesheet summary
      const timesheetResult = await getWeeklyTimesheet(user.id, currentWeek);
      if (timesheetResult.error) {
        setError(timesheetResult.error.message);
        return;
      }

      setTimesheet(timesheetResult.data);

      // Load detailed time logs for the week
      const weekStart = new Date(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const logsResult = await getTimeLogs({
        userId: user.id,
        dateFrom: weekStart.toISOString(),
        dateTo: weekEnd.toISOString()
      });

      if (logsResult.error) {
        setError(logsResult.error.message);
        return;
      }

      setDetailedLogs(logsResult.data || []);
    } catch (err) {
      console.error('Error loading timesheet data:', err);
      setError('Ett oväntat fel inträffade vid laddning av tidrapport.');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeek);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate.toISOString().split('T')[0]);
  };

  const handleEditTimeLog = (timeLog: TimeLogWithRelations) => {
    setEditingLog({ ...timeLog });
    setShowEditModal(true);
  };

  const handleSaveTimeLog = async () => {
    if (!editingLog) return;

    try {
      const { id, order, user: logUser, created_at, updated_at, ...updates } = editingLog;
      
      const result = await updateTimeLog(id, updates);
      if (result.error) {
        showError('Kunde inte spara ändringar', result.error.message);
        return;
      }

      success('Tidlogg uppdaterad!');
      setShowEditModal(false);
      setEditingLog(null);
      await loadTimesheetData();
    } catch (err) {
      console.error('Error saving time log:', err);
      showError('Ett fel inträffade vid sparning');
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheet || !user) return;

    try {
      setSubmitting(true);
      
      const result = await submitTimesheet(
        user.id,
        timesheet.weekStart,
        'Tidrapport inskickad för godkännande'
      );

      if (result.error) {
        showError('Kunde inte skicka tidrapport', result.error.message);
        return;
      }

      success('Tidrapport skickad för godkännande!');
      await loadTimesheetData();
    } catch (err) {
      console.error('Error submitting timesheet:', err);
      showError('Ett fel inträffade vid inskickning');
    } finally {
      setSubmitting(false);
    }
  };

  const addMaterial = () => {
    if (!editingLog) return;
    
    const newMaterial: Material = {
      name: '',
      quantity: 1,
      unit: 'st',
      notes: ''
    };
    
    setEditingLog(prev => prev ? {
      ...prev,
      materials_used: [...prev.materials_used, newMaterial]
    } : null);
  };

  const updateMaterial = (index: number, updates: Partial<Material>) => {
    if (!editingLog) return;
    
    setEditingLog(prev => prev ? {
      ...prev,
      materials_used: prev.materials_used.map((material, i) => 
        i === index ? { ...material, ...updates } : material
      )
    } : null);
  };

  const removeMaterial = (index: number) => {
    if (!editingLog) return;
    
    setEditingLog(prev => prev ? {
      ...prev,
      materials_used: prev.materials_used.filter((_, i) => i !== index)
    } : null);
  };

  const getWeekDateRange = () => {
    const start = new Date(currentWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const isCurrentWeek = () => {
    return currentWeek === getCurrentWeekStart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Laddar tidrapport..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Clock className="w-7 h-7 mr-3 text-blue-600" />
              Tidrapport
            </h1>
            <p className="text-gray-600 mt-1">Vecka {getWeekDateRange()}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setCurrentWeek(getCurrentWeekStart())}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrentWeek() 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Denna vecka
            </button>
            
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
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

      {/* Weekly Summary */}
      {timesheet && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Veckosammanfattning</h2>
            <div className="flex items-center space-x-3">
              {timesheet.isSubmitted ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Inskickad
                </span>
              ) : (
                <button
                  onClick={handleSubmitTimesheet}
                  disabled={submitting || timesheet.totalHours === 0}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Skicka för godkännande
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{timesheet.totalHours}h</div>
              <p className="text-sm text-blue-700">Totala timmar</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(timesheet.totalAmount)}</div>
              <p className="text-sm text-green-700">Beräknad lön</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {timesheet.dailyBreakdown.filter(day => day.hours > 0).length}
              </div>
              <p className="text-sm text-purple-700">Arbetsdagar</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {timesheet.dailyBreakdown.reduce((sum, day) => sum + day.orders.length, 0)}
              </div>
              <p className="text-sm text-orange-700">Uppdrag</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Daglig uppdelning</h3>
            {timesheet.dailyBreakdown.map((day) => (
              <div key={day.date} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('sv-SE', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </h4>
                    <p className="text-sm text-gray-600">{day.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{day.hours}h</div>
                    <div className="text-sm text-gray-600">{formatCurrency(day.amount)}</div>
                  </div>
                </div>

                {day.orders.length > 0 && (
                  <div className="space-y-2">
                    {day.orders.map((order) => (
                      <div key={order.orderId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{order.orderTitle}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{order.hours.toFixed(1)}h</div>
                          <div className="text-xs text-gray-600">{formatCurrency(order.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Time Logs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Detaljerade tidsloggar</h2>
            <span className="text-sm text-gray-500">{detailedLogs.length} poster</span>
          </div>
        </div>

        <div className="p-6">
          {detailedLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">Inga tidsloggar för denna vecka</p>
              <p className="text-sm mt-1">Starta tidtagning från ditt schema för att logga arbetstid</p>
            </div>
          ) : (
            <div className="space-y-4">
              {detailedLogs.map((log) => {
                const duration = log.end_time 
                  ? new Date(log.end_time).getTime() - new Date(log.start_time).getTime()
                  : 0;
                const workMinutes = Math.floor(duration / (1000 * 60)) - (log.break_duration || 0);
                
                return (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <h3 className="font-medium text-gray-900">{log.order?.title}</h3>
                          {log.is_approved ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Start:</span>
                            <p>{formatTime(log.start_time)}</p>
                          </div>
                          <div>
                            <span className="font-medium">Slut:</span>
                            <p>{log.end_time ? formatTime(log.end_time) : 'Pågår'}</p>
                          </div>
                          <div>
                            <span className="font-medium">Arbetstid:</span>
                            <p className="font-bold text-gray-900">
                              {log.end_time ? formatDuration(workMinutes) : 'Pågår'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Belopp:</span>
                            <p className="font-bold text-green-600">{formatCurrency(log.total_amount)}</p>
                          </div>
                        </div>

                        {log.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{log.notes}</p>
                          </div>
                        )}

                        {log.materials_used.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Material använt:</h4>
                            <div className="space-y-1">
                              {log.materials_used.map((material, index) => (
                                <div key={index} className="text-sm text-gray-600">
                                  {material.quantity} {material.unit} {material.name}
                                  {material.notes && ` (${material.notes})`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTimeLog(log)}
                          disabled={log.is_approved}
                          className="text-gray-400 hover:text-blue-600 disabled:opacity-50"
                          title={log.is_approved ? 'Godkända loggar kan inte redigeras' : 'Redigera'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Time Log Modal */}
      {showEditModal && editingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Redigera tidslogg</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLog(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{editingLog.order?.title}</h4>
                <p className="text-sm text-blue-700">
                  Kund: {editingLog.order?.customer?.name}
                </p>
              </div>

              {/* Time Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starttid
                  </label>
                  <input
                    type="datetime-local"
                    value={editingLog.start_time.slice(0, 16)}
                    onChange={(e) => setEditingLog(prev => prev ? {
                      ...prev,
                      start_time: e.target.value + ':00.000Z'
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sluttid
                  </label>
                  <input
                    type="datetime-local"
                    value={editingLog.end_time?.slice(0, 16) || ''}
                    onChange={(e) => setEditingLog(prev => prev ? {
                      ...prev,
                      end_time: e.target.value ? e.target.value + ':00.000Z' : null
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paus (minuter)
                  </label>
                  <input
                    type="number"
                    value={editingLog.break_duration}
                    onChange={(e) => setEditingLog(prev => prev ? {
                      ...prev,
                      break_duration: parseInt(e.target.value) || 0
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restid (minuter)
                  </label>
                  <input
                    type="number"
                    value={editingLog.travel_time_minutes}
                    onChange={(e) => setEditingLog(prev => prev ? {
                      ...prev,
                      travel_time_minutes: parseInt(e.target.value) || 0
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ av arbete
                </label>
                <input
                  type="text"
                  value={editingLog.work_type || ''}
                  onChange={(e) => setEditingLog(prev => prev ? {
                    ...prev,
                    work_type: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="T.ex. Fönsterputsning, Taktvätt"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anteckningar
                </label>
                <textarea
                  value={editingLog.notes || ''}
                  onChange={(e) => setEditingLog(prev => prev ? {
                    ...prev,
                    notes: e.target.value
                  } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Beskriv arbetet som utfördes..."
                />
              </div>

              {/* Materials Used */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Material använt
                  </label>
                  <button
                    onClick={addMaterial}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Lägg till
                  </button>
                </div>
                
                <div className="space-y-2">
                  {editingLog.materials_used.map((material, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={material.name}
                          onChange={(e) => updateMaterial(index, { name: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Materialnamn"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={material.quantity}
                          onChange={(e) => updateMaterial(index, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={material.unit}
                          onChange={(e) => updateMaterial(index, { unit: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="st">st</option>
                          <option value="kg">kg</option>
                          <option value="liter">liter</option>
                          <option value="meter">meter</option>
                          <option value="kvm">kvm</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={material.notes || ''}
                          onChange={(e) => updateMaterial(index, { notes: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Anteckningar"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeMaterial(index)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingLog(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveTimeLog}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Spara ändringar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerTimesheet;