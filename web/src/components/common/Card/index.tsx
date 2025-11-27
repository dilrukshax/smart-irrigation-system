import { Card as MuiCard, CardContent, CardHeader, CardActions, CardProps } from '@mui/material';
import { ReactNode } from 'react';

interface CustomCardProps extends CardProps {
  title?: string;
  subheader?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export default function Card({
  title,
  subheader,
  action,
  footer,
  children,
  ...props
}: CustomCardProps) {
  return (
    <MuiCard {...props}>
      {(title || action) && (
        <CardHeader
          title={title}
          subheader={subheader}
          action={action}
          titleTypographyProps={{ variant: 'h6' }}
        />
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardActions>{footer}</CardActions>}
    </MuiCard>
  );
}
