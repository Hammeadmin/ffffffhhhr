import React from 'react';
import { Plus, Search, FileText, Users, TrendingUp, Briefcase, Calendar, Receipt } from 'lucide-react';

interface EmptyStateProps {
  type: 'orders' | 'customers' | 'quotes' | 'invoices' | 'calendar' | 'search' | 'general';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
  className?: string;
}

function EmptyState({ 
  type, 
  title, 
  description, 
  actionText, 
  onAction, 
  illustration,
  className = '' 
}: EmptyStateProps) {
  const getDefaultContent = () => {
    switch (type) {
      case 'orders':
        return {
          title: 'Inga ordrar ännu',
          description: 'Kom igång genom att lägga till din första order. Ordrar hjälper dig att hålla koll på alla kunduppdrag från första kontakt till fakturering.',
          actionText: 'Lägg till Order',
          icon: Package,
          color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
        };
      case 'customers':
        return {
          title: 'Inga kunder ännu',
          description: 'Bygg upp ditt kundregister genom att lägga till kunder. Håll all viktig kundinformation organiserad på ett ställe.',
          actionText: 'Lägg till Kund',
          icon: Users,
          color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
        };
      case 'quotes':
        return {
          title: 'Inga offerter ännu',
          description: 'Skapa professionella offerter för dina kunder. Följ upp status och konvertera accepterade offerter till jobb.',
          actionText: 'Skapa Offert',
          icon: FileText,
          color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30'
        };
      case 'invoices':
        return {
          title: 'Inga fakturor ännu',
          description: 'Skapa och skicka fakturor direkt från systemet. Följ betalningsstatus och få automatiska påminnelser.',
          actionText: 'Skapa Faktura',
          icon: Receipt,
          color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
        };
      case 'calendar':
        return {
          title: 'Inga händelser ännu',
          description: 'Schemalägg möten, påminnelser och uppgifter. Håll koll på viktiga datum och deadlines.',
          actionText: 'Boka Möte',
          icon: Calendar,
          color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30'
        };
      case 'search':
        return {
          title: 'Inga sökresultat',
          description: 'Vi kunde inte hitta något som matchar din sökning. Försök med andra sökord eller kontrollera stavningen.',
          actionText: 'Rensa sökning',
          icon: Search,
          color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
        };
      default:
        return {
          title: 'Ingen data tillgänglig',
          description: 'Det finns ingen data att visa för tillfället.',
          actionText: 'Uppdatera',
          icon: FileText,
          color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalDescription = description || defaultContent.description;
  const finalActionText = actionText || defaultContent.actionText;
  const Icon = defaultContent.icon;

  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {/* Illustration */}
      <div className="mb-8">
        {illustration || (
          <div className="relative mx-auto w-32 h-32 mb-6">
            {/* Background Circle */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full opacity-50"></div>
            
            {/* Icon Container */}
            <div className={`absolute inset-4 rounded-full flex items-center justify-center ${defaultContent.color}`}>
              <Icon className="w-12 h-12" />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-200 dark:bg-primary-800 rounded-full animate-float" style={{ animationDelay: '0s' }}></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-accent-200 dark:bg-accent-800 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 -right-3 w-3 h-3 bg-green-200 dark:bg-green-800 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 font-primary">
          {finalTitle}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed font-secondary">
          {finalDescription}
        </p>

        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            {finalActionText}
          </button>
        )}

        {/* Secondary Actions */}
        {type !== 'search' && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              <FileText className="w-4 h-4 mr-2" />
              Läs guide
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
              <Search className="w-4 h-4 mr-2" />
              Importera data
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default EmptyState;