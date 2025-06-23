import { Tabs } from 'expo-router';
import { Chrome as Home, MessageSquare, SquarePlus as PlusSquare, ShoppingBag, User, Dumbbell } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { Image, View } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TabLayout() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal, session } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const handleUploadPress = async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Permission to access gallery was denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Navigate to the create post screen with the selected image
        router.push({
          pathname: "/upload",
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      alert('Failed to pick image');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 70,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          height: 50,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
            }}>
              <Home size={24} color={focused ? colors.tint : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
            }}>
              <Dumbbell size={24} color={focused ? colors.tint : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              backgroundColor: colors.tint,
              borderRadius: 25,
              marginTop: -5,
              elevation: 6,
              shadowColor: colors.tint,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}>
              <PlusSquare size={26} color="#fff" />
            </View>
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
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
            }}>
              <ShoppingBag size={24} color={focused ? colors.tint : color} />
            </View>
          ),
          href: '/marketplace',
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
        name="profile"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
            }}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: 14,
                    borderWidth: focused ? 2 : 0,
                    borderColor: colors.tint,
                  }}
                />
              ) : (
                <User size={24} color={focused ? colors.tint : color} />
              )}
            </View>
          ),
          href: '/profile',
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