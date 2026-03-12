// src/app/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* O Stack tira aquele cabeçalho feio nativo, pois nós faremos o nosso */}
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}