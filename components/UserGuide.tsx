import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Package,
  Users, 
  FileText, 
  Calendar,
  Receipt,
  BarChart3,
  TrendingUp,
  Settings
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  content: string;
  icon: React.ComponentType<any>;
  image?: string;
}

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

function UserGuide({ isOpen, onClose }: UserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Välkommen till Momentum CRM',
      content: 'Momentum är ett komplett CRM-system designat för svenska småföretag. Här får du en snabb genomgång av de viktigaste funktionerna.',
      icon: TrendingUp
    },
    {
      id: 'dashboard',
      title: 'Dashboard - Din översikt',
      content: 'Dashboarden ger dig en snabb överblick över din verksamhet. Här ser du viktiga nyckeltal, senaste aktiviteter och kommande uppgifter.',
      icon: BarChart3
    },
    {
      id: 'leads',
      title: 'Order Management',
      content: 'Hantera alla dina ordrar från första kontakt till fakturering med vår Kanban-vy. Dra och släpp ordrar mellan olika statusar och håll koll på alla uppdrag.',
      icon: Package
    },
    {
      id: 'customers',
      title: 'Kundregister',
      content: 'Håll all kundinformation organiserad på ett ställe. Lägg till kontaktuppgifter, anteckningar och se hela kundhistoriken.',
      icon: Users
    },
    {
      id: 'quotes',
      title: 'Offerter',
      content: 'Skapa professionella offerter snabbt och enkelt. Följ upp status och konvertera accepterade offerter till ordrar automatiskt.',
      icon: FileText
    },
    {
      id: 'calendar',
      title: 'Kalender',
      content: 'Schemalägg möten, påminnelser och uppgifter. Synkronisera med externa kalendrar och få påminnelser om viktiga händelser.',
      icon: Calendar
    },
    {
      id: 'invoices',
      title: 'Fakturering',
      content: 'Skapa och skicka fakturor direkt från systemet. Följ betalningsstatus och få automatiska påminnelser för förfallna fakturor.',
      icon: Receipt
    },
    {
      id: 'settings',
      title: 'Inställningar',
      content: 'Anpassa systemet efter dina behov. Konfigurera företagsinformation, användarroller, integrationer och mycket mer.',
      icon: Settings
    }
  ];

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  if (!isOpen) return null;

  const currentGuideStep = guideSteps[currentStep];
  const Icon = currentGuideStep.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-blue-50">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Användarguide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Steg {currentStep + 1} av {guideSteps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / guideSteps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              {currentGuideStep.title}
            </h3>
            <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
              {currentGuideStep.content}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center space-x-2 mb-6">
            {guideSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-blue-600' 
                    : index < currentStep 
                    ? 'bg-blue-300' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Föregående
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Hoppa över
            </button>
            
            {currentStep === guideSteps.length - 1 ? (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Slutför
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Nästa
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserGuide;