import React, { useState } from 'react';
import { ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { ORDER_STATUS_LABELS, getOrderStatusColor, type OrderStatus } from '../types/database';

interface OrderStatusDropdownProps {
  currentStatus: OrderStatus;
  onStatusChange: (newStatus: OrderStatus) => void;
  disabled?: boolean;
  className?: string;
}

function OrderStatusDropdown({ 
  currentStatus, 
  onStatusChange, 
  disabled = false, 
  className = '' 
}: OrderStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusSelect = (newStatus: OrderStatus) => {
    if (newStatus !== currentStatus) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  const getStatusDescription = (status: OrderStatus): string => {
    switch (status) {
      case 'öppen_order':
        return 'Ny order som väntar på bekräftelse';
      case 'bokad_bekräftad':
        return 'Order bekräftad och schemalagd';
      case 'avbokad_kund':
        return 'Kunden har avbokat ordern';
      case 'ej_slutfört':
        return 'Arbetet kunde inte slutföras';
      case 'redo_fakturera':
        return 'Arbetet är klart och redo för fakturering';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'avbokad_kund':
      case 'ej_slutfört':
        return <AlertTriangle className="w-3 h-3 mr-2" />;
      case 'redo_fakturera':
      case 'bokad_bekräftad':
        return <Check className="w-3 h-3 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        }`}
      >
        <div className="flex items-center">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mr-2 ${getOrderStatusColor(currentStatus)}`}>
            {ORDER_STATUS_LABELS[currentStatus]}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => {
              const isSelected = status === currentStatus;
              const statusIcon = getStatusIcon(status as OrderStatus);
              
              return (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status as OrderStatus)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center flex-1">
                    {statusIcon}
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mr-3 ${getOrderStatusColor(status as OrderStatus)}`}>
                          {label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getStatusDescription(status as OrderStatus)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default OrderStatusDropdown;