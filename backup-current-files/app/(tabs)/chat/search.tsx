import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { X, Search as SearchIcon, MessageCircle, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified?: boolean;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = async (query: string) => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, is_verified')
        .neq('id', user.id)
        .ilike('username', `%${query}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (user: User) => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    
    router.push({
      pathname: `/chat/${user.username as string}`,
      params: { avatarUrl: user.avatar_url || undefined }
    });
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: colors.card }]}
      onPress={() => handleUserPress(item)}>
      <View style={styles.userContent}>
        <Image
          source={{
            uri: item.avatar_url ||
              `https://source.unsplash.com/random/100x100/?portrait&${item.id}`
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.usernameContainer}>
            <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
            {item.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {item.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
        <View style={[styles.messageButton, { backgroundColor: colors.tint }]}>
          <MessageCircle size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        borderBottomColor: colors.border,
        backgroundColor: colors.background
      }]}>
        <View style={styles.headerContent}>
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <SearchIcon size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users to message..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery('');
                  setUsers([]);
                }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { 
                backgroundColor: colors.background,
                borderColor: colors.error 
              }]}
              onPress={() => searchUsers(searchQuery)}>
              <Text style={[styles.retryButtonText, { color: colors.error }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Searching users...
            </Text>
          </View>
        ) : searchQuery.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
              <Users size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>Find people to chat with</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Search by username to start a conversation
            </Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
              <SearchIcon size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>No users found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try searching with a different username
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 16,
    marginTop: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  userItem: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  bio: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
  },
  messageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});