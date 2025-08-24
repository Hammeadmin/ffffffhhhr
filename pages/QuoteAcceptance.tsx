import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Calculator,
  Shield,
  Clock,
  User,
  Users
} from 'lucide-react';
import {
  getQuoteByToken,
  acceptQuoteWithROT,
  validateSwedishPersonnummer,
  validateSwedishOrganisationsnummer,
  formatSwedishPersonnummer,
  formatSwedishOrganisationsnummer,
  calculateROTAmount,
  formatROTAmount,
  getROTExplanationText,
  type ROTFormData
} from '../lib/rot';
import { formatCurrency, formatDate } from '../lib/database';
import LoadingSpinner from '../components/LoadingSpinner';

function QuoteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [rotData, setRotData] = useState<ROTFormData>({
    type: 'person',
    identifier: '',
    fastighetsbeteckning: ''
  });

  useEffect(() => {
    if (token) {
      loadQuote();
    }
  }, [token]);

  const loadQuote = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getQuoteByToken(token);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (!result.data) {
        setError('Offerten hittades inte eller har gått ut.');
        return;
      }

      setQuote(result.data);
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Ett oväntat fel inträffade vid laddning av offerten.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!token || !quote) return;

    // Validation
    if (quote.include_rot) {
      if (!rotData.type) {
        setError('Vänligen välj om du är privatperson eller företag.');
        return;
      }

      if (!rotData.identifier) {
        setError('Vänligen ange personnummer eller organisationsnummer.');
        return;
      }

      if (rotData.type === 'person' && !validateSwedishPersonnummer(rotData.identifier)) {
        setError('Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX');
        return;
      }

      if (rotData.type === 'company' && !validateSwedishOrganisationsnummer(rotData.identifier)) {
        setError('Ogiltigt organisationsnummer format. Använd format: XXXXXX-XXXX');
        return;
      }

      if (!rotData.fastighetsbeteckning.trim()) {
        setError('Vänligen ange fastighetsbeteckning.');
        return;
      }
    }

    try {
      setAccepting(true);
      setError(null);

      const result = await acceptQuoteWithROT({
        token,
        rot_data: rotData,
        client_ip: await getClientIP()
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setAccepted(true);
    } catch (err) {
      console.error('Error accepting quote:', err);
      setError('Ett oväntat fel inträffade vid godkännande av offerten.');
    } finally {
      setAccepting(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const calculateSubtotal = () => {
    return (quote?.quote_line_items || []).reduce((sum: number, item: any) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.25; // 25% VAT
  };

  const calculateROTDeduction = () => {
    return quote?.include_rot ? calculateROTAmount(quote.total_amount) : 0;
  };

  const calculateFinalAmount = () => {
    return quote?.total_amount - calculateROTDeduction();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Laddar offert...</p>
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Offert ej tillgänglig</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Kontakta företaget direkt om du har frågor om din offert.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Tack!</h1>
            <p className="text-xl text-gray-700 mb-6">Din offert är nu godkänd.</p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">Vad händer nu?</h3>
              <ul className="text-sm text-green-800 space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vi har mottagit ditt godkännande och kommer att kontakta dig inom 24 timmar</span>
                </li>
                <li className="flex items-start">
                  <Calendar className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Vi kommer att schemalägga arbetet enligt överenskommelse</span>
                </li>
                {quote?.include_rot && calculateROTDeduction() > 0 && (
                  <li className="flex items-start">
                    <Calculator className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>ROT-avdraget på {formatROTAmount(calculateROTDeduction())} kommer att dras av från fakturan</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <p>Referensnummer: {quote?.quote_number}</p>
              <p>Godkänt: {new Date().toLocaleDateString('sv-SE')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {quote?.organisation?.name || 'Momentum CRM'}
                </h1>
                <p className="text-gray-600">Offertgodkännande</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Offert</p>
              <p className="text-lg font-bold text-gray-900">{quote?.quote_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quote Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{quote?.title}</h2>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Giltig till</p>
                  <p className="font-medium text-gray-900">
                    {quote?.valid_until ? formatDate(quote.valid_until) : 'Enligt överenskommelse'}
                  </p>
                </div>
              </div>

              {quote?.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Beskrivning</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
                </div>
              )}

              {/* Line Items */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-4">Offertspecifikation</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b-2 border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Beskrivning</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Antal</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">À-pris</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(quote?.quote_line_items || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Moms (25%):</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculateVAT())}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Totalt:</span>
                      <span>{formatCurrency(quote?.total_amount || 0)}</span>
                    </div>
                    
                    {/* ROT Deduction */}
                    {quote?.include_rot && calculateROTDeduction() > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-green-600 border-t border-green-200 pt-2">
                          <span>ROT-avdrag (50%):</span>
                          <span className="font-medium">-{formatROTAmount(calculateROTDeduction())}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-green-700 border-t border-green-300 pt-2">
                          <span>Att betala efter ROT:</span>
                          <span>{formatROTAmount(calculateFinalAmount())}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ROT Information */}
            {quote?.include_rot && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <Calculator className="w-6 h-6 text-green-600 mr-3" />
                  <h3 className="text-lg font-bold text-gray-900">ROT-avdrag</h3>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800 leading-relaxed">
                    {getROTExplanationText()}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Jag är: *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="rot_type"
                          value="person"
                          checked={rotData.type === 'person'}
                          onChange={(e) => setRotData(prev => ({ ...prev, type: e.target.value as 'person' }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Privatperson</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Arbetet utförs på din permanenta bostad eller fritidsbostad
                          </p>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="rot_type"
                          value="company"
                          checked={rotData.type === 'company'}
                          onChange={(e) => setRotData(prev => ({ ...prev, type: e.target.value as 'company' }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 text-gray-600 mr-2" />
                            <span className="text-sm font-medium text-gray-900">Företag</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Arbetet utförs på företagets fastighet
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {rotData.type === 'person' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Personnummer *
                      </label>
                      <input
                        type="text"
                        value={rotData.identifier}
                        onChange={(e) => {
                          const formatted = e.target.value.length >= 10 
                            ? formatSwedishPersonnummer(e.target.value)
                            : e.target.value;
                          setRotData(prev => ({ ...prev, identifier: formatted }));
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                          rotData.identifier && !validateSwedishPersonnummer(rotData.identifier)
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="YYYYMMDD-XXXX"
                      />
                      {rotData.identifier && !validateSwedishPersonnummer(rotData.identifier) && (
                        <p className="text-xs text-red-600 mt-1">
                          Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX
                        </p>
                      )}
                    </div>
                  )}

                  {rotData.type === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organisationsnummer *
                      </label>
                      <input
                        type="text"
                        value={rotData.identifier}
                        onChange={(e) => {
                          const formatted = e.target.value.length >= 10 
                            ? formatSwedishOrganisationsnummer(e.target.value)
                            : e.target.value;
                          setRotData(prev => ({ ...prev, identifier: formatted }));
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                          rotData.identifier && !validateSwedishOrganisationsnummer(rotData.identifier)
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="XXXXXX-XXXX"
                      />
                      {rotData.identifier && !validateSwedishOrganisationsnummer(rotData.identifier) && (
                        <p className="text-xs text-red-600 mt-1">
                          Ogiltigt organisationsnummer format. Använd format: XXXXXX-XXXX
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fastighetsbeteckning *
                    </label>
                    <input
                      type="text"
                      value={rotData.fastighetsbeteckning}
                      onChange={(e) => setRotData(prev => ({ ...prev, fastighetsbeteckning: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="T.ex. STOCKHOLM SÖDERMALM 1:1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Fastighetsbeteckning finns på fastighetsregistret eller kan fås från kommun
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Kunduppgifter</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{quote?.customer?.name}</span>
                </div>
                {quote?.customer?.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{quote.customer.email}</span>
                  </div>
                )}
                {quote?.customer?.phone_number && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">{quote.customer.phone_number}</span>
                  </div>
                )}
                {quote?.customer?.address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div className="text-gray-600">
                      <p>{quote.customer.address}</p>
                      <p>{quote.customer.postal_code} {quote.customer.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Företagsinformation</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-900">{quote?.organisation?.name}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">info@momentum.se</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">+46 8 123 456 78</span>
                </div>
                {quote?.organisation?.org_number && (
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Org.nr: {quote.organisation.org_number}
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Säker offerthantering</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Denna offert är säkert krypterad och kan endast godkännas en gång. 
                    Dina uppgifter behandlas enligt GDPR.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Accept Button */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Godkänn offert</h3>
            <p className="text-gray-600 mb-6">
              Genom att godkänna denna offert accepterar du villkoren och bekräftar beställningen.
            </p>
            
            <button
              onClick={handleAcceptQuote}
              disabled={accepting || (quote?.include_rot && (!rotData.identifier || !rotData.fastighetsbeteckning))}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              {accepting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Godkänner offert...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Godkänn offert
                  {quote?.include_rot && calculateROTDeduction() > 0 && (
                    <span className="ml-2 text-sm opacity-90">
                      (Betala {formatROTAmount(calculateFinalAmount())})
                    </span>
                  )}
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-3">
              Genom att klicka godkänner du våra allmänna villkor och bekräftar beställningen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteAcceptance;