import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ShareModal } from './ShareModal';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export const SharePostTest: React.FC = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [showShareModal, setShowShareModal] = useState(false);

  const testPostId = '00000000-0000-0000-0000-000000000000'; // Test post ID

  const handleTestShare = () => {
    setShowShareModal(true);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Share Post Feature Test
      </Text>
      
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: colors.tint }]}
        onPress={handleTestShare}
      >
        <Text style={styles.buttonText}>Test Share Post</Text>
      </TouchableOpacity>

      <ShareModal
        postId={testPostId}
        postUrl={`https://gymsta.app/post/${testPostId}`}
        postTitle="Test Post for Sharing"
        postImageUrl="https://via.placeholder.com/300x300"
        authorUsername="testuser"
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  testButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
