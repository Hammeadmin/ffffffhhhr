import React from 'react';
import { Calculator, Info, FileText, User, Building } from 'lucide-react';
import { formatROTAmount, type ROTData } from '../lib/rot';
import { formatCurrency } from '../lib/database';

interface ROTInformationProps {
  data: ROTData;
  totalAmount: number;
  showDetails?: boolean;
  className?: string;
}

function ROTInformation({ data, totalAmount, showDetails = true, className = '' }: ROTInformationProps) {
  if (!data.include_rot || !data.rot_amount) {
    return null;
  }

  const netAmount = totalAmount - (data.rot_amount || 0);

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-3">
        <Calculator className="w-5 h-5 text-green-600 mr-2" />
        <h4 className="font-medium text-green-900">ROT-avdrag inkluderat</h4>
      </div>

      {showDetails && (
        <div className="space-y-3">
          {/* Customer Type */}
          <div className="flex items-center text-sm">
            {data.rot_personnummer ? (
              <>
                <User className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-800">
                  Privatperson: {data.rot_personnummer}
                </span>
              </>
            ) : data.rot_organisationsnummer ? (
              <>
                <Building className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-800">
                  Företag: {data.rot_organisationsnummer}
                </span>
              </>
            ) : null}
          </div>

          {/* Property Designation */}
          {data.rot_fastighetsbeteckning && (
            <div className="flex items-center text-sm">
              <FileText className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-800">
                Fastighet: {data.rot_fastighetsbeteckning}
              </span>
            </div>
          )}

          {/* ROT Calculation */}
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Totalt belopp:</span>
                <span className="text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Arbetskostnad (70%):</span>
                <span className="text-gray-900">{formatCurrency(totalAmount * 0.7)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-medium">
                <span>ROT-avdrag (50%):</span>
                <span>-{formatROTAmount(data.rot_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2 font-bold text-green-800">
                <span>Att betala:</span>
                <span>{formatROTAmount(netAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start text-xs text-green-700">
            <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
            <span>
              ROT-avdraget dras av direkt från fakturan. Du behöver inte ansöka separat hos Skatteverket.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ROTInformation;