import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Edit, Send } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText, ThemedH2 } from '@/components/ThemedText';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';

const DRAFTS_KEY_PREFIX = 'post_drafts_';

interface Draft {
  id: string;
  imageUri: string;
  caption: string;
  createdAt: string;
}

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const loadDrafts = useCallback(async () => {
    if (!user) {
      setDrafts([]);
      return;
    }
    try {
      const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
      const savedDrafts = await AsyncStorage.getItem(DRAFTS_KEY);
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        // Sort by most recent
        parsedDrafts.sort((a: Draft, b: Draft) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDrafts(parsedDrafts);
      } else {
        setDrafts([]);
      }
    } catch (e) {
      console.error("Failed to load drafts.", e);
      setDrafts([]);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleEditDraft = (draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    router.push({
      pathname: '/(tabs)/upload',
      params: { imageUri: draft?.imageUri, draftId },
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    const confirmDelete = async () => {
      if (!user) return;
      try {
        // 1️⃣ Optimistically update local state so UI responds instantly
        setDrafts(prev => prev.filter(d => d.id !== draftId));

        // 2️⃣ Persist the new list into storage
        const DRAFTS_KEY = `${DRAFTS_KEY_PREFIX}${user.id}`;
        const stored = await AsyncStorage.getItem(DRAFTS_KEY);
        const parsed: Draft[] = stored ? JSON.parse(stored) : [];
        const updated = parsed.filter(d => d.id !== draftId);

        if (updated.length === 0) {
          await AsyncStorage.removeItem(DRAFTS_KEY);
        } else {
          await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
        }

        // Refresh from storage to ensure list is fully up to date (defensive)
        loadDrafts();
        Alert.alert('Draft Deleted', 'The draft has been removed.');
      } catch (e) {
        console.error('Failed to delete draft.', e);
        Alert.alert('Error', 'Could not delete the draft.');
      }
    };

    if (Platform.OS === 'web') {
      // React Native Web cannot handle Alert with multiple buttons, so use window.confirm
      if (window.confirm('Delete draft? This action cannot be undone.')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Draft',
        'Are you sure you want to delete this draft? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const renderItem = ({ item }: { item: Draft }) => (
    <View style={[styles.draftContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.draftHeader}>
        <Image source={{ uri: profile?.avatar_url || undefined }} style={styles.avatar} />
        <Text style={[styles.username, { color: colors.text }]}>{profile?.username}</Text>
      </View>
      <Image source={{ uri: item.imageUri }} style={styles.draftImage} />
      {item.caption && (
        <Text style={[styles.caption, { color: colors.text }]} numberOfLines={3}>
          {item.caption}
        </Text>
      )}
      <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionButton} onPress={() =>
          router.push({
            pathname: '/(tabs)/upload',
            params: { imageUri: item.imageUri, draftId: item.id, caption: item.caption },
          })
        }>
          <Send size={20} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Post</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEditDraft(item.id)}>
          <Edit size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteDraft(item.id)}>
          <X size={20} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedH2>Drafts</ThemedH2>
      </View>
      <FlatList
        data={drafts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={{fontSize: 18}}>No Drafts Found</ThemedText>
            <ThemedText style={{color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm}}>
              Your saved posts will appear here.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  draftContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  draftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  caption: {
    padding: Spacing.md,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 150,
  },
}); 