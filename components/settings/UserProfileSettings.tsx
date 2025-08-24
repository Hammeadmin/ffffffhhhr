import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  notifications: {
    email_leads: boolean;
    email_quotes: boolean;
    email_jobs: boolean;
    email_invoices: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
  };
}

interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function UserProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    full_name: '',
    email: '',
    phone_number: '',
    role: '',
    notifications: {
      email_leads: true,
      email_quotes: true,
      email_jobs: true,
      email_invoices: true,
      push_notifications: true,
      sms_notifications: false
    }
  });

  const [passwordData, setPasswordData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        setError('Kunde inte ladda användarprofil: ' + error.message);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || '',
          email: user.email || '',
          phone_number: data.phone_number || '',
          role: data.role || '',
          notifications: {
            email_leads: data.email_leads !== undefined ? data.email_leads : true,
            email_quotes: data.email_quotes !== undefined ? data.email_quotes : true,
            email_jobs: data.email_jobs !== undefined ? data.email_jobs : true,
            email_invoices: data.email_invoices !== undefined ? data.email_invoices : true,
            push_notifications: data.push_notifications !== undefined ? data.push_notifications : true,
            sms_notifications: data.sms_notifications !== undefined ? data.sms_notifications : false
          }
        });
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Ett oväntat fel inträffade vid laddning av användarprofil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Only update columns that exist in the database
      const updateData: any = {
        full_name: profile.full_name,
        phone_number: profile.phone_number
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) {
        setError('Kunde inte spara användarprofil: ' + error.message);
        return;
      }

      setSuccess('Användarprofil sparad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving user profile:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Nya lösenord matchar inte.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Nytt lösenord måste vara minst 6 tecken långt.');
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        setError('Kunde inte ändra lösenord: ' + error.message);
        return;
      }

      setSuccess('Lösenord ändrat framgångsrikt!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Ett oväntat fel inträffade vid ändring av lösenord.');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administratör';
      case 'sales': return 'Säljare';
      case 'worker': return 'Medarbetare';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Användarprofil</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="bg-white rounded-lg p-6 animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="w-7 h-7 mr-3 text-blue-600" />
            Användarprofil
          </h2>
          <p className="mt-2 text-gray-600">
            Hantera dina personliga inställningar och preferenser
          </p>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Spara ändringar
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Personlig information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fullständigt namn *
              </label>
              <input
                type="text"
                required
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Förnamn Efternamn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-postadress
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                E-postadressen kan inte ändras här. Kontakta administratör för att ändra.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefonnummer
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  value={profile.phone_number}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+46 70 123 45 67"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roll
              </label>
              <input
                type="text"
                value={getRoleLabel(profile.role)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Din roll kan endast ändras av en administratör.
              </p>
            </div>

          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-blue-600" />
            Ändra lösenord
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuvarande lösenord
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ange nuvarande lösenord"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nytt lösenord
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ange nytt lösenord"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bekräfta nytt lösenord
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bekräfta nytt lösenord"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Ändra lösenord
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          Notifieringsinställningar
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-4">E-postnotifieringar</h4>
            <div className="space-y-3">
              {[
                { key: 'email_leads', label: 'Nya leads och lead-uppdateringar' },
                { key: 'email_quotes', label: 'Offert-statusändringar och påminnelser' },
                { key: 'email_jobs', label: 'Jobb-tilldelningar och uppdateringar' },
                { key: 'email_invoices', label: 'Faktura-statusändringar och betalningar' }
              ].map((item) => (
                <label key={item.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profile.notifications[item.key as keyof typeof profile.notifications]}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        [item.key]: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Andra notifieringar</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.notifications.push_notifications}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      push_notifications: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">Push-notifieringar i webbläsaren</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.notifications.sms_notifications}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      sms_notifications: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">SMS-notifieringar (kräver telefonnummer)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileSettings;