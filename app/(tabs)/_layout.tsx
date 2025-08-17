import { Tabs, useRouter, useSegments, usePathname } from 'expo-router';
import { House, MessageSquare, SquarePlus as PlusSquare, ShoppingBag, User, Zap } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useHomeScreen } from '@/context/HomeScreenContext';
import { useDoubleTap } from '@/lib/doubleTapUtils';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { Image, View, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import GradientTabIcon, { GradientUploadButton } from '@/components/GradientTabIcon';

export default function TabLayout() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal, session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [lastHomeRoute, setLastHomeRoute] = useState<string>('/');
  
  // Get home screen functions for double tap
  let homeScreenFunctions: any = null;
  try {
    homeScreenFunctions = useHomeScreen();
  } catch (error) {
    // Context not available, that's okay
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single();
      if (!error && data) {
        setAvatarUrl(data.avatar_url);
      }
    };
    loadProfile();
  }, [session]);

  // Track last route within the Home/Explore context so returning to the Home tab restores where you left off
  useEffect(() => {
    if (!pathname) return;
    // segments example: ['(tabs)', 'index'] or ['(tabs)', '[username]'] or ['(tabs)', 'post', '[id]']
    if (Array.isArray(segments) && segments.length > 0 && segments[0] === '(tabs)') {
      const top = segments[1] as string | undefined;
      if (top && (top === 'index' || top === '[username]' || top === 'post')) {
        setLastHomeRoute(pathname as string);
      }
    }
  }, [pathname, Array.isArray(segments) ? segments.join('/') : String(segments)]);

  const handleTabPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleHomeSingleTap = () => {
    // Single tap - navigate to home
    router.replace(lastHomeRoute as any);
  };

  const handleHomeDoubleTap = () => {
    // Double tap - scroll to top and refresh
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (homeScreenFunctions?.scrollToTopAndRefresh) {
      homeScreenFunctions.scrollToTopAndRefresh();
    }
  };

  const handleHomeTap = useDoubleTap({
    onSingleTap: handleHomeSingleTap,
    onDoubleTap: handleHomeDoubleTap,
  });

  const handleUploadPress = async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }

    // Add haptic feedback for upload action
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Show action sheet to choose between camera and gallery
    Alert.alert(
      'Create Post',
      'Choose how you want to add a photo',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: "/upload",
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (err) {
      console.error('Error opening camera:', err);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        router.push({
          pathname: "/upload",
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 90,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
          paddingBottom: Spacing.lg,
          paddingTop: Spacing.sm,
          paddingHorizontal: Spacing.sm,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          height: 50,
          borderRadius: BorderRadius.lg,
          marginHorizontal: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon focused={focused} inactiveColor={color}>
              <House size={24} />
            </GradientTabIcon>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            handleTabPress();
            // Use double tap handler for home button
            e.preventDefault();
            handleHomeTap();
          },
        }}
      />
      <Tabs.Screen
        name="fitness"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon focused={focused} inactiveColor={color}>
              <Zap size={24} />
            </GradientTabIcon>
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <GradientUploadButton>
              <PlusSquare size={28} color="#fff" />
            </GradientUploadButton>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleUploadPress();
          },
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon focused={focused} inactiveColor={color}>
              <ShoppingBag size={24} />
            </GradientTabIcon>
          ),
          href: '/marketplace',
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // This hides the chat tab but keeps the route accessible
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // This hides the notifications tab but keeps the route accessible
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null, // This hides the search tab but keeps the route accessible
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <GradientTabIcon focused={focused} inactiveColor={color} size={44}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ 
                    width: focused ? 28 : 24, 
                    height: focused ? 28 : 24, 
                    borderRadius: focused ? 14 : 12,
                  }}
                />
              ) : (
                <User size={24} />
              )}
            </GradientTabIcon>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();

            // Add haptic feedback
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            if (!isAuthenticated) {
              showAuthModal();
              return;
            }

            // Always navigate to the root of the profile tab (reset stack)
            router.replace('/profile');
          },
        }}
      />
      <Tabs.Screen
        name="post/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="[username]"
        options={{
          href: null, // This hides the tab but keeps the route accessible
        }}
      />
    </Tabs>
  );
}