import React from 'react';
import { View, StyleSheet } from 'react-native';
import GymstaPost from './GymstaPost';
import { testVideoPost } from './testVideoPost';
import Colors from '@/constants/Colors';

// Dummy props for GymstaPost
const dummyProps = {
  post: testVideoPost,
  colors: Colors['light'],
  playingVideo: null,
  currentUserId: 'user-456',
  flaggedPosts: {},
  flagging: {},
  setFlagging: () => {},
  setFlaggedPosts: () => {},
  isAuthenticated: true,
  showAuthModal: () => {},
  toggleVideoPlayback: () => {},
  navigateToProfile: () => {},
  handleLike: () => {},
  handleUnlike: () => {},
  videoRefs: { current: {} },
  handleDeletePost: () => {},
};

export default function TestVideoPostScreen() {
  return (
    <View style={styles.container}>
      <GymstaPost {...dummyProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
