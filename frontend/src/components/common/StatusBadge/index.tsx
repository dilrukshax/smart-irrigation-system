import { Chip, ChipProps } from '@mui/material';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'small' | 'medium';
}

const statusColors: Record<string, ChipProps['color']> = {
  success: 'success',
  ok: 'success',
  healthy: 'success',
  active: 'success',
  low: 'success',
  warning: 'warning',
  medium: 'warning',
  'mild-stress': 'warning',
  pending: 'warning',
  error: 'error',
  critical: 'error',
  high: 'error',
  'severe-stress': 'error',
  inactive: 'error',
  info: 'info',
  default: 'default',
  unknown: 'default',
};

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const color = statusColors[status.toLowerCase()] || 'default';
  
  return (
    <Chip
      label={label || status}
      color={color}
      size={size}
      sx={{ textTransform: 'capitalize' }}
    />
  );
}
