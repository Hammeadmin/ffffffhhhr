import React from 'react';
import { Settings as SettingsIcon, User, Users2, Bell, Shield, CreditCard, Mail, Building, Asterisk as System, Zap, FormInput, FileText, Package } from 'lucide-react';
import ReminderManagement from '../components/ReminderManagement';
import CompanyProfileSettings from '../components/settings/CompanyProfileSettings';
import UserProfileSettings from '../components/settings/UserProfileSettings';
import SystemSettings from '../components/settings/SystemSettings';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import LeadFormBuilder from '../components/settings/LeadFormBuilder';
import QuoteTemplateSettings from '../components/settings/QuoteTemplateSettings';
import ProductLibrarySettings from '../components/settings/ProductLibrarySettings';
import TeamManagement from '../components/TeamManagement';
import ROTReport from '../components/ROTReport';
import { Calculator } from 'lucide-react';

function Settings() {
  const [activeTab, setActiveTab] = React.useState<'company' | 'user' | 'system' | 'integrations' | 'forms' | 'templates' | 'products' | 'reminders' | 'rot' | 'general'>('company');

  const settingsCategories = [
    {
      title: 'Profil',
      description: 'Hantera din personliga information',
      icon: User,
      items: ['Personuppgifter', 'Lösenord', 'Säkerhet']
    },
    {
      title: 'Notifikationer',
      description: 'Konfigurera dina aviseringar',
      icon: Bell,
      items: ['E-postnotiser', 'Push-notiser', 'SMS-påminnelser']
    },
    {
      title: 'Säkerhet',
      description: 'Säkerhetsinställningar och behörigheter',
      icon: Shield,
      items: ['Tvåfaktorsautentisering', 'Sessionshantering', 'API-nycklar']
    },
    {
      title: 'Fakturering',
      description: 'Hantera betalning och prenumeration',
      icon: CreditCard,
      items: ['Betalningsmetoder', 'Fakturor', 'Prenumerationsplan']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3 text-blue-600" />
          Inställningar
        </h1>
        <p className="mt-2 text-gray-600">Hantera dina konto- och systeminställningar</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'company', label: 'Företag', icon: Building },
            { id: 'user', label: 'Användare', icon: User },
            { id: 'teams', label: 'Team', icon: Users2 },
            { id: 'system', label: 'System', icon: SettingsIcon },
            { id: 'integrations', label: 'Integrationer', icon: Zap },
            { id: 'forms', label: 'Formulär', icon: FormInput },
            { id: 'templates', label: 'Offertmallar', icon: FileText },
            { id: 'products', label: 'Artiklar', icon: Package },
            { id: 'reminders', label: 'Påminnelser', icon: Mail },
            { id: 'rot', label: 'ROT-rapport', icon: Calculator }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="w-4 h-4 mr-2 inline" />
            Allmänt
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'company' && <CompanyProfileSettings />}
      {activeTab === 'user' && <UserProfileSettings />}
      {activeTab === 'teams' && <TeamManagement />}
      {activeTab === 'system' && <SystemSettings />}
      {activeTab === 'integrations' && <IntegrationSettings />}
      {activeTab === 'forms' && <LeadFormBuilder />}
      {activeTab === 'templates' && <QuoteTemplateSettings />}
      {activeTab === 'products' && <ProductLibrarySettings />}
      {activeTab === 'reminders' && <ReminderManagement />}
      {activeTab === 'rot' && <ROTReport />}
      {activeTab === 'general' && (
        <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.title} className="bg-white shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-center text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Systeminfo</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Version:</span>
            <p className="text-gray-900">1.0.0</p>
          </div>
          <div>
            <span className="font-medium text-gray-500">Senast uppdaterad:</span>
            <p className="text-gray-900">2024-01-15</p>
          </div>
          <div>
            <span className="font-medium text-gray-500">Support:</span>
            <p className="text-blue-600 hover:text-blue-700 cursor-pointer">support@momentum.se</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default Settings;