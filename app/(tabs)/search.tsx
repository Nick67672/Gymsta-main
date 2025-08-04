import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, MapPin, Users } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { BorderRadius, Spacing } from '@/constants/Spacing';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  gym: string | null;
  is_verified?: boolean;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = Colors[theme];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [gymSuggestions, setGymSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserGym, setCurrentUserGym] = useState<string | null>(null);

  // Load current user's gym and gym suggestions
  useEffect(() => {
    loadUserGym();
  }, []);

  const loadUserGym = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym')
        .eq('id', user.id)
        .single();

      if (profile?.gym) {
        setCurrentUserGym(profile.gym);
        loadGymSuggestions(profile.gym);
      }
    } catch (error) {
      console.error('Error loading user gym:', error);
    }
  };

  const loadGymSuggestions = async (gym: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, gym, is_verified')
        .eq('gym', gym)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setGymSuggestions(data || []);
    } catch (error) {
      console.error('Error loading gym suggestions:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, gym, is_verified')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const navigateToProfile = (userId: string, username: string) => {
    router.push(`/${username}`);
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => navigateToProfile(item.id, item.username)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.usernameRow}>
          <Text style={[styles.username, { color: colors.text }]}>
            {item.username}
          </Text>
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>
        {item.gym && (
          <View style={styles.gymRow}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={[styles.gymText, { color: colors.textSecondary }]}>
              {item.gym}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Results */}
        {searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Search Results
            </Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No users found
                  </Text>
                }
              />
            )}
          </View>
        )}

        {/* Gym Suggestions */}
        {!searchQuery.trim() && gymSuggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                From Your Gym
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              People from {currentUserGym}
            </Text>
            <FlatList
              data={gymSuggestions}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Explore Section (placeholder for future features) */}
        {!searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Discover
            </Text>
            <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
              More discovery features coming soon...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  gymText: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    padding: Spacing.lg,
    fontSize: 16,
  },
  comingSoonText: {
    textAlign: 'center',
    padding: Spacing.lg,
    fontSize: 16,
    fontStyle: 'italic',
  },
});