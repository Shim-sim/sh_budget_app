import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import colors from '../../constants/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
}

export default function Button({ title, loading, variant = 'primary', disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = {
    primary: `bg-primary rounded-2xl py-4 items-center ${isDisabled ? 'opacity-60' : ''}`,
    outline: `bg-transparent border border-primary rounded-2xl py-4 items-center ${isDisabled ? 'opacity-60' : ''}`,
    ghost: `bg-transparent py-4 items-center`,
  }[variant];

  const textStyle = {
    primary: 'text-white font-semibold text-base',
    outline: 'text-primary font-semibold text-base',
    ghost: 'text-primary text-sm font-semibold',
  }[variant];

  return (
    <TouchableOpacity
      className={containerStyle}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
        : <Text className={textStyle}>{title}</Text>
      }
    </TouchableOpacity>
  );
}
