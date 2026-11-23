import Svg, { Path } from 'react-native-svg';

/**
 * The streak flame (design file "Streak_Icon.png"), drawn as a vector so it stays sharp at any size:
 * terracotta flame with a cream drop inside. Use this for every streak in the app.
 */
export function StreakIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 32) / 30} viewBox="0 0 30 32" accessibilityLabel="Streak">
      <Path
        d="M15 3.5C18.6 8.2 24.2 12.6 24.2 20.6C24.2 26.4 20.2 30.2 15 30.2C9.8 30.2 5.8 26.4 5.8 20.6C5.8 12.6 11.4 8.2 15 3.5Z"
        fill="#C58259"
      />
      <Path
        d="M15 15.2C17.4 18.1 20 20.3 20 24.6C20 27.6 17.8 29.6 15 29.6C12.2 29.6 10 27.6 10 24.6C10 20.3 12.6 18.1 15 15.2Z"
        fill="#F7F2EB"
      />
    </Svg>
  );
}
