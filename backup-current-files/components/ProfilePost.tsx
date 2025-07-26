import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Post } from '@/types/social';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';
import { Heart, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';

interface ProfilePostProps {
  post: Post;
}

const ProfilePost: React.FC<ProfilePostProps> = ({ post }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => router.push(`/post/${post.id}`)}
      activeOpacity={0.8}
    >
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.image} />
      )}
      <View style={styles.overlay}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Heart size={16} color="#fff" />
            <Text style={styles.statText}>{post.likes?.length || 0}</Text>
          </View>
          {/* Add comment count if available in your Post type */}
          {/* <View style={styles.stat}>
            <MessageCircle size={16} color="#fff" />
            <Text style={styles.statText}>{post.comments?.length || 0}</Text>
          </View> */}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  statText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },
});

export default ProfilePost; 