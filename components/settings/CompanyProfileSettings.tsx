import React, { useState, useEffect } from 'react';
import {
  Building,
  Upload,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface CompanyProfile {
  id: string;
  name: string;
  org_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  website?: string;
  logo_url?: string;
  bank_account?: string;
  bank_name?: string;
  vat_number?: string;
  description?: string;
}

// Fixed demo organization ID
const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

function CompanyProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [profile, setProfile] = useState<CompanyProfile>({
    id: DEMO_ORG_ID,
    name: '',
    org_number: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    website: '',
    logo_url: '',
    bank_account: '',
    bank_name: '',
    vat_number: '',
    description: ''
  });

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', DEMO_ORG_ID)
        .single();

      if (error) {
        setError('Kunde inte ladda företagsprofil: ' + error.message);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          name: data.name || '',
          org_number: data.org_number || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          city: data.city || '',
          website: data.website || '',
          logo_url: data.logo_url || '',
          bank_account: data.bank_account || '',
          bank_name: data.bank_name || '',
          vat_number: data.vat_number || '',
          description: data.description || ''
        });
      }
    } catch (err) {
      console.error('Error loading company profile:', err);
      setError('Ett oväntat fel inträffade vid laddning av företagsprofil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('organisations')
        .update({
          name: profile.name,
          org_number: profile.org_number,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          postal_code: profile.postal_code,
          city: profile.city,
          website: profile.website,
          logo_url: profile.logo_url,
          bank_account: profile.bank_account,
          bank_name: profile.bank_name,
          vat_number: profile.vat_number,
          description: profile.description
        })
        .eq('id', DEMO_ORG_ID);

      if (error) {
        setError('Kunde inte spara företagsprofil: ' + error.message);
        return;
      }

      setSuccess('Företagsprofil sparad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving company profile:', err);
      setError('Ett oväntat fel inträffade vid sparning.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vänligen välj en bildfil (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Bilden är för stor. Maximal storlek är 2MB.');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${DEMO_ORG_ID}-logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (error) {
        setError('Kunde inte ladda upp logotyp: ' + error.message);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update profile with new logo URL
      setProfile(prev => ({ ...prev, logo_url: publicUrl }));
      
      setSuccess('Logotyp uppladdad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Ett oväntat fel inträffade vid uppladdning av logotyp.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateOrgNumber = (orgNumber: string): boolean => {
    // Swedish organization number validation (simplified)
    const cleaned = orgNumber.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const validateVATNumber = (vatNumber: string): boolean => {
    // Swedish VAT number validation (simplified)
    const cleaned = vatNumber.replace(/\D/g, '');
    return cleaned.length === 12 && cleaned.startsWith('SE');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Företagsinformation</h2>
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
            <Building className="w-7 h-7 mr-3 text-blue-600" />
            Företagsinformation
          </h2>
          <p className="mt-2 text-gray-600">
            Hantera ditt företags grundläggande information och inställningar
          </p>
        </div>
        <button
          onClick={handleSave}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo Upload */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Företagslogotyp</h3>
            
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {profile.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Företagslogotyp"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <Camera className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                    {uploadingLogo ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {profile.logo_url ? 'Byt logotyp' : 'Ladda upp logotyp'}
                  </span>
                </label>
                
                <p className="text-xs text-gray-500">
                  JPG, PNG eller GIF. Max 2MB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Grundläggande information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ditt företagsnamn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisationsnummer
                </label>
                <input
                  type="text"
                  value={profile.org_number}
                  onChange={(e) => setProfile(prev => ({ ...prev, org_number: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    profile.org_number && !validateOrgNumber(profile.org_number)
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="556123-4567"
                />
                {profile.org_number && !validateOrgNumber(profile.org_number) && (
                  <p className="text-xs text-red-600 mt-1">Ogiltigt organisationsnummer</p>
                )}
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
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="info@företag.se"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefonnummer
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+46 8 123 456 78"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webbsida
                </label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.företag.se"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT-nummer
                </label>
                <input
                  type="text"
                  value={profile.vat_number}
                  onChange={(e) => setProfile(prev => ({ ...prev, vat_number: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    profile.vat_number && !validateVATNumber(profile.vat_number)
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="SE556123456701"
                />
                {profile.vat_number && !validateVATNumber(profile.vat_number) && (
                  <p className="text-xs text-red-600 mt-1">Ogiltigt VAT-nummer</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Företagsbeskrivning
              </label>
              <textarea
                value={profile.description}
                onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Beskriv ditt företag och vad ni gör..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Adressinformation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gatuadress
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Storgatan 123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postnummer
            </label>
            <input
              type="text"
              value={profile.postal_code}
              onChange={(e) => setProfile(prev => ({ ...prev, postal_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 45"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stad
            </label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Stockholm"
            />
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
          Bankinformation för fakturor
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banknamn
            </label>
            <input
              type="text"
              value={profile.bank_name}
              onChange={(e) => setProfile(prev => ({ ...prev, bank_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Swedbank, SEB, Handelsbanken..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kontonummer
            </label>
            <input
              type="text"
              value={profile.bank_account}
              onChange={(e) => setProfile(prev => ({ ...prev, bank_account: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="1234 12 34567"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <FileText className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Information om bankinformation</h4>
              <p className="text-sm text-blue-700 mt-1">
                Denna information kommer att visas på dina fakturor så att kunder vet var de ska betala.
                Se till att informationen är korrekt och uppdaterad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyProfileSettings;