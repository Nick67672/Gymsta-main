import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';

interface TestPost {
  id: string;
  user_id: string;
  caption: string;
  created_at: string;
  profiles: {
    username: string;
  } | {
    username: string;
  }[];
}

export default function TestDeleteFunctionality() {
  const [posts, setPosts] = useState<TestPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      setCurrentUserId(user?.id || null);
      console.log('🧪 Current user ID:', user?.id);

      // Get recent posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          caption,
          created_at,
          profiles (
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      setPosts(postsData || []);
      console.log('🧪 Loaded posts:', postsData?.length);
      console.log('🧪 User\'s own posts:', postsData?.filter(p => p.user_id === user?.id).length);
    } catch (error) {
      console.error('🧪 Error loading data:', error);
      Alert.alert('Error', 'Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  const testDelete = async (postId: string) => {
    console.log('🧪 Testing delete for post:', postId);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      console.log('🧪 Current user:', user.id);
      
      // Find the post
      const post = posts.find(p => p.id === postId);
      if (!post) {
        Alert.alert('Error', 'Post not found');
        return;
      }

      console.log('🧪 Post owner:', post.user_id);
      console.log('🧪 Can delete:', post.user_id === user.id);

      if (post.user_id !== user.id) {
        Alert.alert('Error', 'You can only delete your own posts');
        return;
      }

      // Attempt delete
      console.log('🧪 Attempting delete...');
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('🧪 Delete error:', error);
        Alert.alert('Delete Error', `${error.message}\n\nCode: ${error.code}\nDetails: ${error.details}`);
        return;
      }

      console.log('🧪 Delete successful!');
      Alert.alert('Success', 'Post deleted successfully!');
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('🧪 Unexpected error:', error);
      Alert.alert('Error', 'Unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading test data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Test ({posts.length} posts)</Text>
      <Text style={styles.subtitle}>User ID: {currentUserId}</Text>
      
      <ScrollView style={styles.scrollView}>
        {posts.map((post) => {
          const isOwn = post.user_id === currentUserId;
          return (
            <View key={post.id} style={[styles.postItem, isOwn && styles.ownPost]}>
              <Text style={styles.postText}>
                {post.caption.substring(0, 50)}...
              </Text>
                             <Text style={styles.postMeta}>
                 By: {Array.isArray(post.profiles) ? post.profiles[0]?.username : post.profiles.username} | {isOwn ? 'YOUR POST' : 'NOT YOURS'}
               </Text>
              <Text style={styles.postId}>ID: {post.id}</Text>
              
              {isOwn && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => testDelete(post.id)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Test Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
      
      <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  postItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ownPost: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  postText: {
    fontSize: 16,
    marginBottom: 5,
  },
  postMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  postId: {
    fontSize: 10,
    color: '#999',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 