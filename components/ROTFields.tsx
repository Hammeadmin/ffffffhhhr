import React from 'react';
import { Info, Calculator, HelpCircle } from 'lucide-react';
import {
  validateSwedishPersonnummer,
  validateSwedishOrganisationsnummer,
  formatSwedishPersonnummer,
  formatSwedishOrganisationsnummer,
  calculateROTAmount,
  getROTExplanationText,
  formatROTAmount,
  type ROTData
} from '../lib/rot';
import HelpTooltip from './HelpTooltip';

interface ROTFieldsProps {
  data: ROTData;
  onChange: (data: ROTData) => void;
  totalAmount?: number;
  showCalculation?: boolean;
  className?: string;
}

function ROTFields({ 
  data, 
  onChange, 
  totalAmount = 0, 
  showCalculation = true,
  className = '' 
}: ROTFieldsProps) {
  const [rotType, setRotType] = React.useState<'person' | 'company' | ''>(() => {
    if (data.rot_personnummer) return 'person';
    if (data.rot_organisationsnummer) return 'company';
    return '';
  });

  const handleROTToggle = (includeROT: boolean) => {
    onChange({
      ...data,
      include_rot: includeROT,
      rot_personnummer: includeROT ? data.rot_personnummer : null,
      rot_organisationsnummer: includeROT ? data.rot_organisationsnummer : null,
      rot_fastighetsbeteckning: includeROT ? data.rot_fastighetsbeteckning : null,
      rot_amount: includeROT ? calculateROTAmount(totalAmount) : 0
    });
  };

  const handleTypeChange = (type: 'person' | 'company' | '') => {
    setRotType(type);
    onChange({
      ...data,
      rot_personnummer: type === 'person' ? data.rot_personnummer : null,
      rot_organisationsnummer: type === 'company' ? data.rot_organisationsnummer : null
    });
  };

  const handleIdentifierChange = (identifier: string) => {
    if (rotType === 'person') {
      const formatted = identifier.length >= 10 ? formatSwedishPersonnummer(identifier) : identifier;
      onChange({
        ...data,
        rot_personnummer: formatted,
        rot_amount: data.include_rot ? calculateROTAmount(totalAmount) : 0
      });
    } else if (rotType === 'company') {
      const formatted = identifier.length >= 10 ? formatSwedishOrganisationsnummer(identifier) : identifier;
      onChange({
        ...data,
        rot_organisationsnummer: formatted,
        rot_amount: data.include_rot ? calculateROTAmount(totalAmount) : 0
      });
    }
  };

  const handleFastighetsbeteckningChange = (value: string) => {
    onChange({
      ...data,
      rot_fastighetsbeteckning: value,
      rot_amount: data.include_rot ? calculateROTAmount(totalAmount) : 0
    });
  };

  const getIdentifierValidation = () => {
    if (rotType === 'person' && data.rot_personnummer) {
      return validateSwedishPersonnummer(data.rot_personnummer);
    } else if (rotType === 'company' && data.rot_organisationsnummer) {
      return validateSwedishOrganisationsnummer(data.rot_organisationsnummer);
    }
    return true;
  };

  const isIdentifierValid = getIdentifierValidation();
  const calculatedROTAmount = data.include_rot ? calculateROTAmount(totalAmount) : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ROT Toggle */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.include_rot}
              onChange={(e) => handleROTToggle(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-blue-900">
              Inkludera ROT-avdrag
            </span>
          </label>
          <HelpTooltip
            content={getROTExplanationText()}
            title="Vad är ROT-avdrag?"
            size="lg"
          />
        </div>
        
        {showCalculation && data.include_rot && (
          <div className="text-right">
            <div className="flex items-center text-sm text-blue-700">
              <Calculator className="w-4 h-4 mr-1" />
              <span className="font-medium">
                ROT-avdrag: {formatROTAmount(calculatedROTAmount)}
              </span>
            </div>
            <div className="text-xs text-blue-600">
              Att betala: {formatROTAmount(totalAmount - calculatedROTAmount)}
            </div>
          </div>
        )}
      </div>

      {/* ROT Information Fields */}
      {data.include_rot && (
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Typ av kund *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rot_type"
                  value="person"
                  checked={rotType === 'person'}
                  onChange={(e) => handleTypeChange(e.target.value as 'person')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-700">Privatperson</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rot_type"
                  value="company"
                  checked={rotType === 'company'}
                  onChange={(e) => handleTypeChange(e.target.value as 'company')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-700">Företag</span>
              </label>
            </div>
          </div>

          {rotType === 'person' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personnummer *
              </label>
              <input
                type="text"
                value={data.rot_personnummer || ''}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  data.rot_personnummer && !isIdentifierValid
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="YYYYMMDD-XXXX eller YYMMDD-XXXX"
              />
              {data.rot_personnummer && !isIdentifierValid && (
                <p className="text-xs text-red-600 mt-1">
                  Ogiltigt personnummer format. Använd format: YYYYMMDD-XXXX
                </p>
              )}
            </div>
          )}

          {rotType === 'company' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organisationsnummer *
              </label>
              <input
                type="text"
                value={data.rot_organisationsnummer || ''}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  data.rot_organisationsnummer && !isIdentifierValid
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="XXXXXX-XXXX"
              />
              {data.rot_organisationsnummer && !isIdentifierValid && (
                <p className="text-xs text-red-600 mt-1">
                  Ogiltigt organisationsnummer format. Använd format: XXXXXX-XXXX
                </p>
              )}
            </div>
          )}

          {rotType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fastighetsbeteckning *
                <HelpTooltip
                  content="Fastighetsbeteckning anger vilken fastighet arbetet utförs på. Exempel: STOCKHOLM SÖDERMALM 1:1"
                  title="Vad är fastighetsbeteckning?"
                />
              </label>
              <input
                type="text"
                value={data.rot_fastighetsbeteckning || ''}
                onChange={(e) => handleFastighetsbeteckningChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="T.ex. STOCKHOLM SÖDERMALM 1:1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fastighetsbeteckning finns på fastighetsregistret eller kan fås från kommun
              </p>
            </div>
          )}

          {/* ROT Calculation Display */}
          {data.include_rot && totalAmount > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                ROT-beräkning
              </h4>
              <div className="text-sm text-green-800 space-y-1">
                <div className="flex justify-between">
                  <span>Totalt belopp:</span>
                  <span>{formatROTAmount(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Arbetskostnad (70%):</span>
                  <span>{formatROTAmount(totalAmount * 0.7)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ROT-avdrag (50% av arbetskostnad):</span>
                  <span className="font-bold">{formatROTAmount(calculatedROTAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-green-300 pt-1 font-bold">
                  <span>Att betala efter ROT:</span>
                  <span>{formatROTAmount(totalAmount - calculatedROTAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-2">
                * ROT-avdraget dras av direkt från fakturan. Du behöver inte ansöka separat.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ROTFields;