import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
  Alert,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Mic,
  MicOff,
  Send,
  Smile,
  Camera,
  Image as ImageIcon,
  AtSign,
  Hash,
  Bold,
  Italic,
  Link,
  X,
  Play,
  Pause,
  Volume2,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

const { height: screenHeight } = Dimensions.get('window');

// Enhanced emoji reactions beyond basic like
const EMOJI_REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😠', label: 'Angry' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'muscle', emoji: '💪', label: 'Strong' },
  { id: 'mind_blown', emoji: '🤯', label: 'Mind Blown' },
  { id: 'thumbs_up', emoji: '👍', label: 'Thumbs Up' },
];

const POPULAR_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤔', '😮', '😢', '😠', '👍', '👎',
  '❤️', '🔥', '💪', '🎉', '👏', '🙏', '💯', '✨', '⚡', '🌟',
  '🏋️', '💪', '🥇', '🎯', '🚀', '💎', '🔥', '⭐', '🌈', '☀️'
];

interface EnhancedCommentInputProps {
  onSubmit: (content: string, mediaUrl?: string, mediaType?: 'text' | 'voice' | 'image' | 'gif') => void;
  placeholder?: string;
  replyingTo?: { username: string; commentId: string } | null;
  onCancelReply?: () => void;
  maxLength?: number;
  aiModerationEnabled?: boolean;
  userAvatar?: string;
}

export const EnhancedCommentInput: React.FC<EnhancedCommentInputProps> = ({
  onSubmit,
  placeholder = "Add a thoughtful comment...",
  replyingTo,
  onCancelReply,
  maxLength = 2200,
  aiModerationEnabled = true,
  userAvatar,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = Colors[theme];
  
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'gif' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textFormat, setTextFormat] = useState({
    bold: false,
    italic: false,
  });
  const [mentions, setMentions] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [voicePreview, setVoicePreview] = useState<{ uri: string; duration: number } | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const textInputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const micButtonScale = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;

  // Voice recording setup
  useEffect(() => {
    setupAudio();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  };

  // Pan responder for mic button
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(micButtonScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: (evt, gestureState) => {
      // Add visual feedback for slide to cancel
      const { dx, dy } = gestureState;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 100) {
        // Show cancel hint
        Vibration.vibrate(50);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 100) {
        // Cancel recording
        cancelRecording();
      } else {
        // Stop and save recording
        stopRecording();
      }
      
      Animated.spring(micButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
  });

  const startRecording = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000) as any;

      // Start wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (uri && recordingDuration >= 1) {
        setVoicePreview({ uri, duration: recordingDuration });
      }

      cleanup();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      cleanup();
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      cleanup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      cleanup();
    }
  };

  const cleanup = () => {
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    waveAnimation.stopAnimation();
  };

  const playVoicePreview = async () => {
    if (!voicePreview) return;

    try {
      if (isPlayingVoice) {
        await soundRef.current?.pauseAsync();
        setIsPlayingVoice(false);
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: voicePreview.uri });
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingVoice(false);
          }
        });
        
        await sound.playAsync();
        setIsPlayingVoice(true);
      }
    } catch (error) {
      console.error('Failed to play voice preview:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia({
          uri: result.assets[0].uri,
          type: 'image',
        });
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia({
          uri: result.assets[0].uri,
          type: 'image',
        });
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !voicePreview && !selectedMedia) || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      let mediaUrl: string | undefined;
      let mediaType: 'text' | 'voice' | 'image' | 'gif' = 'text';

      if (voicePreview) {
        mediaUrl = voicePreview.uri;
        mediaType = 'voice';
      } else if (selectedMedia) {
        mediaUrl = selectedMedia.uri;
        mediaType = selectedMedia.type;
      }

      await onSubmit(text.trim(), mediaUrl, mediaType);
      
      // Reset form
      setText('');
      setVoicePreview(null);
      setSelectedMedia(null);
      setMentions([]);
      setHashtags([]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to submit comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    const newText = text + emoji;
    setText(newText);
    setShowEmojiPicker(false);
    textInputRef.current?.focus();
  };

  const insertMention = (username: string) => {
    const newText = text + `@${username} `;
    setText(newText);
    if (!mentions.includes(username)) {
      setMentions([...mentions, username]);
    }
  };

  const insertHashtag = (tag: string) => {
    const newText = text + `#${tag} `;
    setText(newText);
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = text.trim().length > 0 || voicePreview || selectedMedia;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Reply indicator */}
      {replyingTo && (
        <View style={[styles.replyContainer, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.replyText, { color: colors.textSecondary }]}>
            Replying to @{replyingTo.username}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Voice preview */}
      {voicePreview && (
        <View style={[styles.voicePreview, { 
          backgroundColor: isDarkMode ? '#1A3A5C' : '#E3F2FD',
          borderColor: colors.border 
        }]}>
          <TouchableOpacity onPress={playVoicePreview} style={[styles.voicePlayButton, { backgroundColor: colors.background }]}>
            {isPlayingVoice ? <Pause size={20} color={colors.tint} /> : <Play size={20} color={colors.tint} />}
          </TouchableOpacity>
          <Text style={[styles.voiceDuration, { color: colors.tint }]}>{formatTime(voicePreview.duration)}</Text>
          <TouchableOpacity onPress={() => setVoicePreview(null)}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview */}
      {selectedMedia && (
        <View style={styles.mediaPreview}>
          <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => setSelectedMedia(null)}
          >
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main input area */}
      <View style={styles.inputContainer}>
        {userAvatar && (
          <Image source={{ uri: userAvatar }} style={[styles.userAvatar, { borderColor: colors.border }]} />
        )}

        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
          {/* Text input */}
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              { color: colors.text },
              textFormat.bold && styles.boldText,
              textFormat.italic && styles.italicText,
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={maxLength}
            editable={!isRecording}
          />

          {/* Character count */}
          <Text style={[
            styles.charCount, 
            { color: colors.textTertiary },
            text.length > maxLength * 0.9 && { color: '#FF6B6B' }
          ]}>
            {text.length}/{maxLength}
          </Text>

          {/* Advanced tools bar */}
          <View style={styles.toolsBar}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowEmojiPicker(true)}
            >
              <Smile size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => insertMention('')}
            >
              <AtSign size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => insertHashtag('')}
            >
              <Hash size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={pickImage}
            >
              <ImageIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={takePhoto}
            >
              <Camera size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={() => setShowAdvancedTools(!showAdvancedTools)}
            >
              <Text style={[styles.moreTools, { color: colors.textSecondary }]}>•••</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice recording button */}
        <Animated.View
          style={[
            styles.micContainer,
            { transform: [{ scale: micButtonScale }] },
          ]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={isRecording ? ['#FF6B6B', '#FF8E8E'] : [colors.tint, colors.tint]}
            style={styles.micButton}
          >
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <Animated.View
                  style={[
                    styles.waveCircle,
                    {
                      opacity: waveAnimation,
                      transform: [
                        {
                          scale: waveAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <MicOff size={24} color="#fff" />
              </View>
            ) : (
              <Mic size={24} color="#fff" />
            )}
          </LinearGradient>
        </Animated.View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSubmit && [styles.sendButtonActive, { backgroundColor: colors.tint }],
            isSubmitting && styles.sendButtonDisabled,
            !canSubmit && { backgroundColor: colors.textTertiary }
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Recording status */}
      {isRecording && (
        <View style={[styles.recordingStatus, { backgroundColor: colors.backgroundSecondary }]}>
          <Volume2 size={16} color="#FF6B6B" />
          <Text style={styles.recordingText}>
            Recording... {formatTime(recordingDuration)}
          </Text>
          <Text style={[styles.recordingHint, { color: colors.textTertiary }]}>Release to send, slide to cancel</Text>
        </View>
      )}

      {/* Emoji picker modal */}
      <Modal
        visible={showEmojiPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.emojiPicker, { backgroundColor: colors.background }]}>
            <View style={styles.emojiHeader}>
              <Text style={[styles.emojiTitle, { color: colors.text }]}>Choose an emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Reaction emojis */}
            <Text style={[styles.emojiSectionTitle, { color: colors.textSecondary }]}>Quick Reactions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactionEmojis}>
              {EMOJI_REACTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.id}
                  style={styles.reactionButton}
                  onPress={() => insertEmoji(reaction.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={[styles.reactionLabel, { color: colors.textTertiary }]}>{reaction.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Popular emojis */}
            <Text style={[styles.emojiSectionTitle, { color: colors.textSecondary }]}>Popular</Text>
            <View style={styles.emojiGrid}>
              {POPULAR_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => insertEmoji(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  replyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  replyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  voicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  voiceDuration: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mediaPreview: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInput: {
    fontSize: 15,
    maxHeight: 120,
    marginBottom: 12,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: '500',
  },
  charCountWarning: {
    color: '#FF6B6B',
  },
  toolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  toolButton: {
    padding: 8,
    borderRadius: 12,
  },
  moreTools: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  micContainer: {
    position: 'relative',
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  recordingIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonActive: {
    backgroundColor: '#4A90E2',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  recordingText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  recordingHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  emojiPicker: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: (screenHeight as number) * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  emojiTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emojiSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 20,
    letterSpacing: 0.3,
  },
  reactionEmojis: {
    marginBottom: 16,
  },
  reactionButton: {
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 12,
  },
  reactionEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  reactionLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emojiButton: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
  },
  emoji: {
    fontSize: 28,
  },
});

export default EnhancedCommentInput; 