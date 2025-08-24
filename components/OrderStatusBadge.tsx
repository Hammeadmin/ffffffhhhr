import React from 'react';
import { ORDER_STATUS_LABELS, getOrderStatusColor, type OrderStatus } from '../types/database';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function OrderStatusBadge({ status, className = '', size = 'md' }: OrderStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-xs',
    lg: 'px-3 py-2 text-sm'
  };

  return (
    <span 
      className={`inline-flex items-center font-semibold rounded-full ${getOrderStatusColor(status)} ${sizeClasses[size]} ${className}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export default OrderStatusBadge;