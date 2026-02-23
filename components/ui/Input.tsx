import { View, Text, TextInput, TextInputProps } from 'react-native';
import colors from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <View>
      {label && (
        <Text className="text-sm font-medium text-text-secondary mb-2">{label}</Text>
      )}
      <TextInput
        className={`bg-card rounded-2xl px-4 py-4 text-text-primary text-base border ${
          error ? 'border-expense' : 'border-border'
        }`}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && (
        <Text className="text-expense text-xs mt-1.5 ml-1">{error}</Text>
      )}
    </View>
  );
}
