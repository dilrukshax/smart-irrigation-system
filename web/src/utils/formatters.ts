import { format, formatDistance, parseISO } from 'date-fns';

// Date formatters
export const formatDate = (date: Date | string, formatStr = 'MMM dd, yyyy') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const formatDateTime = (date: Date | string) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
};

// Number formatters
export const formatNumber = (num: number, decimals = 2) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatPercentage = (num: number, decimals = 1) => {
  return `${(num * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (amount: number, currency = 'LKR') => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Area formatter
export const formatArea = (hectares: number) => {
  return `${formatNumber(hectares, 2)} ha`;
};

// Water volume formatter
export const formatWaterVolume = (mcm: number) => {
  if (mcm >= 1) {
    return `${formatNumber(mcm, 2)} MCM`;
  }
  return `${formatNumber(mcm * 1000, 0)} m³`;
};
