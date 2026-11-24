import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The admin site is a plain website, separate from the Expo app: it is never bundled
// into the phone app. It reuses the app's design tokens from ../src/theme/colors.ts.
export default defineConfig({
  plugins: [react()],
  // Use this folder's tsconfig even for ../src/theme/colors.ts (the Expo one needs the app's node_modules).
  tsconfig: './tsconfig.json',
  // Accept the app's EXPO_PUBLIC_ names too, so the same .env lines work here.
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  server: { port: 5174, fs: { allow: ['..'] } },
});
