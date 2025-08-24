import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQProps {
  isOpen: boolean;
  onClose: () => void;
}

function FAQ({ isOpen, onClose }: FAQProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'Hur lägger jag till en ny order?',
      answer: 'Klicka på "Lägg till Order" knappen på Order-sidan eller använd tangentbordsgenvägen "N" när du är på Order-sidan. Fyll i formuläret med orderinformation och klicka "Skapa Order".',
      category: 'Ordrar'
    },
    {
      id: '2',
      question: 'Hur ändrar jag status på en order?',
      answer: 'Du kan dra och släppa ordrar mellan olika statuskolumner i Kanban-vyn, eller öppna order-detaljerna och ändra status där.',
      category: 'Ordrar'
    },
    {
      id: '3',
      question: 'Hur skapar jag en offert från en order?',
      answer: 'Öppna order-detaljerna och klicka på "Skapa Offert" knappen. Detta kommer att skapa en ny offert baserad på order-informationen.',
      category: 'Offerter'
    },
    {
      id: '4',
      question: 'Kan jag anpassa offertnumrering?',
      answer: 'Ja, gå till Inställningar > System och konfigurera nummerformat för offerter. Du kan använda variabler som {YYYY} för år och {####} för löpnummer.',
      category: 'Offerter'
    },
    {
      id: '5',
      question: 'Hur lägger jag till teammedlemmar?',
      answer: 'Gå till Team-sidan och klicka "Lägg till Teammedlem". Fyll i användarinformation och välj lämplig roll (Admin, Säljare, eller Medarbetare).',
      category: 'Team'
    },
    {
      id: '6',
      question: 'Vilka roller finns tillgängliga?',
      answer: 'Det finns tre roller: Admin (full åtkomst), Säljare (ordrar, offerter, kunder), och Medarbetare (ordrar, kalender, begränsad kundvy).',
      category: 'Team'
    },
    {
      id: '7',
      question: 'Hur ställer jag in automatiska påminnelser?',
      answer: 'Gå till Inställningar > Påminnelser för att konfigurera automatiska e-postpåminnelser för offerter och fakturor.',
      category: 'Inställningar'
    },
    {
      id: '8',
      question: 'Kan jag exportera min data?',
      answer: 'Ja, de flesta sidor har en "Exportera" knapp som låter dig ladda ner data som CSV eller JSON. Du kan också göra fullständiga backups från Inställningar > Integrationer.',
      category: 'Data'
    },
    {
      id: '9',
      question: 'Hur synkroniserar jag med Google Calendar?',
      answer: 'Gå till Inställningar > Integrationer och konfigurera Google Calendar-integrationen med dina API-nycklar.',
      category: 'Integrationer'
    },
    {
      id: '10',
      question: 'Vilka tangentbordsgenvägar finns?',
      answer: 'Tryck "?" för att se alla tillgängliga tangentbordsgenvägar. Några viktiga: G+D (Dashboard), G+O (Ordrar), Ctrl+K (Sök), N (Ny post).',
      category: 'Navigation'
    }
  ];

  const categories = ['all', ...Array.from(new Set(faqItems.map(item => item.category)))];

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'all': return 'Alla kategorier';
      case 'Ordrar': return 'Ordrar';
      case 'Offerter': return 'Offerter';
      case 'Team': return 'Team';
      case 'Inställningar': return 'Inställningar';
      case 'Data': return 'Data & Export';
      case 'Integrationer': return 'Integrationer';
      case 'Navigation': return 'Navigation';
      default: return category;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <HelpCircle className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Vanliga frågor</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Sök i vanliga frågor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FAQ Items */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Inga frågor matchar din sökning</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const isExpanded = expandedItems.includes(item.id);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.question}</h3>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full mt-2 inline-block">
                          {item.category}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-700 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Hittade du inte svar på din fråga? Kontakta support på support@momentum.se
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;