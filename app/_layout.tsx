import '@/lib/polyfills';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Suppress specific warning that doesn't affect functionality
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component.',
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { BlockingProvider } from '@/context/BlockingContext';
import { TabProvider } from '@/context/TabContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function LoadingScreen() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: theme === 'dark' ? '#000' : '#fff' }]}>
      <ActivityIndicator size="large" color={theme === 'dark' ? '#fff' : '#000'} />
      <Text style={[styles.loadingText, { color: theme === 'dark' ? '#fff' : '#000' }]}>
        Loading...
      </Text>
    </View>
  );
}

function AppContent() {
  useFrameworkReady();
  const { loading } = useAuth();
  const { theme } = useTheme();
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <BlockingProvider>
                <TabProvider>
                  <AppContent />
                </TabProvider>
              </BlockingProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});