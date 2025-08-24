import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Clock,
  MapPin,
  Camera,
  FileText,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Thermometer,
  Plus,
  Trash2
} from 'lucide-react';
import {
  getActiveTimeLog,
  startTimeTracking,
  stopTimeTracking,
  updateTimeLog,
  getCurrentLocation,
  getMockWeatherData,
  formatDuration,
  type TimeLogWithRelations,
  type Material
} from '../lib/timeLogs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface TimeTrackingWidgetProps {
  orderId: string;
  orderTitle: string;
  onTimeLogUpdate?: () => void;
  className?: string;
}

function TimeTrackingWidget({ 
  orderId, 
  orderTitle, 
  onTimeLogUpdate,
  className = '' 
}: TimeTrackingWidgetProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTimeLog, setActiveTimeLog] = useState<TimeLogWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopData, setStopData] = useState({
    breakDuration: 0,
    notes: '',
    materials: [] as Material[],
    photoUrls: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadActiveTimeLog();
    }
  }, [user, orderId]);

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTimeLog?.start_time) {
        const start = new Date(activeTimeLog.start_time);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTimeLog]);

  const loadActiveTimeLog = async () => {
    try {
      setLoading(true);
      
      if (!user) return;

      const result = await getActiveTimeLog(user.id);
      if (result.error) {
        console.error('Error loading active time log:', result.error);
        return;
      }

      // Only set if it's for this specific order
      if (result.data?.order_id === orderId) {
        setActiveTimeLog(result.data);
      } else {
        setActiveTimeLog(null);
      }
    } catch (err) {
      console.error('Error loading active time log:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTracking = async () => {
    if (!user) return;

    try {
      const location = await getCurrentLocation();
      const weatherData = await getMockWeatherData(location?.lat, location?.lng);
      
      const result = await startTimeTracking(
        orderId,
        user.id,
        orderTitle,
        location,
        `${weatherData.temperature}°C, ${weatherData.condition}`
      );

      if (result.error) {
        showError('Kunde inte starta tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(result.data as TimeLogWithRelations);
      success('Tidtagning startad!');
      onTimeLogUpdate?.();
    } catch (err) {
      console.error('Error starting time tracking:', err);
      showError('Ett fel inträffade vid start av tidtagning');
    }
  };

  const handleStopTracking = async () => {
    if (!activeTimeLog) return;

    try {
      const result = await stopTimeTracking(
        activeTimeLog.id,
        stopData.breakDuration,
        stopData.notes,
        stopData.materials,
        stopData.photoUrls
      );

      if (result.error) {
        showError('Kunde inte stoppa tidtagning', result.error.message);
        return;
      }

      setActiveTimeLog(null);
      setShowStopModal(false);
      setStopData({
        breakDuration: 0,
        notes: '',
        materials: [],
        photoUrls: []
      });
      success('Tidtagning stoppad och sparad!');
      onTimeLogUpdate?.();
    } catch (err) {
      console.error('Error stopping time tracking:', err);
      showError('Ett fel inträffade vid stopp av tidtagning');
    }
  };

  const addMaterial = () => {
    setStopData(prev => ({
      ...prev,
      materials: [...prev.materials, { name: '', quantity: 1, unit: 'st', notes: '' }]
    }));
  };

  const updateMaterial = (index: number, updates: Partial<Material>) => {
    setStopData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, ...updates } : material
      )
    }));
  };

  const removeMaterial = (index: number) => {
    setStopData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Laddar...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Tidtagning
          </h3>

          {activeTimeLog ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Tidtagning pågår</span>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm">Aktiv</span>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    {formatDuration(elapsedTime)}
                  </div>
                  <p className="text-sm text-green-600">
                    Startad: {new Date(activeTimeLog.start_time).toLocaleTimeString('sv-SE')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowStopModal(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Square className="w-5 h-5 mr-2" />
                Stoppa tidtagning
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Ingen aktiv tidtagning</p>
              </div>

              <button
                onClick={handleStartTracking}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Play className="w-5 h-5 mr-2" />
                Starta tidtagning
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stop Tracking Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Avsluta tidtagning</h3>
              <button
                onClick={() => setShowStopModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Sammanfattning</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Arbetstid:</span>
                    <p className="font-bold text-blue-900">{formatDuration(elapsedTime)}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Uppdrag:</span>
                    <p className="font-bold text-blue-900">{orderTitle}</p>
                  </div>
                </div>
              </div>

              {/* Break Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paus (minuter)
                </label>
                <input
                  type="number"
                  value={stopData.breakDuration}
                  onChange={(e) => setStopData(prev => ({
                    ...prev,
                    breakDuration: parseInt(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  placeholder="0"
                />
              </div>

              {/* Work Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arbetsanteckningar
                </label>
                <textarea
                  value={stopData.notes}
                  onChange={(e) => setStopData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
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
                  {stopData.materials.map((material, index) => (
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

              {/* Photo Upload Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dokumentation (foton)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Fotofunktion kommer snart</p>
                  <p className="text-xs text-gray-500">Dokumentera arbetet med bilder</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowStopModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleStopTracking}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <Square className="w-4 h-4 mr-2" />
                Stoppa tidtagning
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TimeTrackingWidget;