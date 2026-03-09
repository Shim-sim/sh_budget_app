import { View, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const THRESHOLD = 80;

export function PullIndicator({
  pullDistance,
  refreshing,
  pulling,
}: {
  pullDistance: number;
  refreshing: boolean;
  pulling: boolean;
}) {
  if (!pulling && !refreshing) return null;

  const rotation = Math.min((pullDistance / THRESHOLD) * 180, 180);

  return (
    <View
      style={{
        height: pullDistance,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {refreshing ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
          <Ionicons name="arrow-down" size={20} color={colors.primary} />
        </View>
      )}
    </View>
  );
}
