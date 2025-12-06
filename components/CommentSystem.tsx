import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  Send,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { getAvatarUrl } from '@/lib/avatarUtils';
import { ConfirmModal } from './ConfirmModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Simple Comment Interface
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  profile: {
    id: string;
    username: string;
    avatar_url: string;
  };
  user_has_liked: boolean;
  replies?: Comment[]; // For nested structure
  is_reply_to_reply?: boolean; // To handle nested reply logic
  reply_to_username?: string; // Username of person being replied to
}

interface CommentSystemProps {
  postId: string;
  visible: boolean;
  onClose: () => void;
  initialCommentCount?: number;
  postOwnerId?: string;
  onCommentCountChange?: (count: number) => void;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  postId,
  visible,
  onClose,
  initialCommentCount = 0,
  postOwnerId,
  onCommentCountChange,
}) => {
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] = useState<Comment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Load comments when modal opens
  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  // Real-time subscription
  useEffect(() => {
    if (!visible || !postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [visible, postId]);

  // Update parent component when comment count changes
  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(allComments.length);
    }
  }, [allComments.length, onCommentCountChange]);

  // Organize comments into threaded structure
  const threadedComments = useMemo(() => {
    const commentMap = new Map<string, Comment>();
    const topLevelComments: Comment[] = [];

    // First pass: create map of all comments
    allComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into threads
    allComments.forEach(comment => {
      if (comment.parent_comment_id) {
        // This is a reply
        let parent = commentMap.get(comment.parent_comment_id);
        
        // Find the top-level parent if it's a nested reply
        let topLevelParentId = comment.parent_comment_id;
        while(parent && parent.parent_comment_id) {
          topLevelParentId = parent.parent_comment_id;
          parent = commentMap.get(parent.parent_comment_id);
        }
        
        const topLevelParent = commentMap.get(topLevelParentId);
        if (topLevelParent) {
          topLevelParent.replies = topLevelParent.replies || [];
          topLevelParent.replies.push(commentMap.get(comment.id)!);
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentMap.get(comment.id)!);
      }
    });

    // Sort top-level comments by creation time
    topLevelComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Sort replies within each thread
    topLevelComments.forEach(comment => {
      if (comment.replies) {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

    return topLevelComments;
  }, [allComments]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          ),
          comment_likes (
            user_id
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedComments = data?.map(comment => ({
        ...comment,
        profile: comment.profiles,
        user_has_liked: comment.comment_likes?.some((like: any) => like.user_id === user?.id) || false,
      })) || [];

      setAllComments(processedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    
    setSubmitting(true);
    try {
      let finalContent = commentText.trim();
      let parentId = replyingTo?.id || null;

      // Handle nested replies - prepend @username
      if (replyingTo && replyingTo.parent_comment_id) {
        parentId = replyingTo.parent_comment_id;
        if (!finalContent.startsWith(`@${replyingTo.profile.username}`)) {
          finalContent = `@${replyingTo.profile.username} ${finalContent}`;
        }
      }

      const newComment = {
        post_id: postId,
        user_id: user.id,
        content: finalContent,
        parent_comment_id: parentId,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(newComment)
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const processedComment = {
        ...data,
        profile: data.profiles,
        user_has_liked: false,
        likes_count: 0,
        replies_count: 0,
      };

      setAllComments(prev => [...prev, processedComment]);
      setCommentText('');
      setReplyingTo(null);

      // Auto-expand replies if this was a reply
      if (parentId) {
        setExpandedReplies(prev => new Set(prev).add(parentId!));
      }

    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const comment = allComments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.user_has_liked) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          });
      }

      // Update local state
      setAllComments(prev => prev.map(c => 
        c.id === commentId 
          ? {
              ...c,
              user_has_liked: !c.user_has_liked,
              likes_count: c.user_has_liked ? c.likes_count - 1 : c.likes_count + 1,
            }
          : c
      ));

    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const renderCommentContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is a mention
        return (
          <Text key={index} style={[styles.mentionText, { color: colors.tint }]}>
            @{part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const canDelete = user?.id === comment.user_id;

    return (
      <View key={comment.id}>
        <Pressable
          onLongPress={() => {
            setSelectedComment(comment);
            setShowOptionsModal(true);
          }}
          style={[
          styles.commentContainer,
          isReply && styles.replyContainer,
        ]}
        >
          <Image source={{ uri: comment.profile.avatar_url }} style={styles.avatar} />
          
          <View style={styles.commentContent}>
            <View style={styles.commentTextContainer}>
              <Text style={[styles.commentText, { color: colors.text }]}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {comment.profile.username}
                </Text>
                <Text> </Text>
                {renderCommentContent(comment.content)}
              </Text>
            </View>
            
            <View style={styles.commentActions}>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatTimeAgo(comment.created_at)}
              </Text>
              
              {comment.likes_count > 0 && (
                <Text style={[styles.likesText, { color: colors.textSecondary }]}>
                  {comment.likes_count} {comment.likes_count === 1 ? 'like' : 'likes'}
                </Text>
              )}
              
              <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                <Text style={[styles.replyText, { color: colors.textSecondary }]}>
                  Reply
                </Text>
              </TouchableOpacity>

              {/* Delete action moved to long-press options */}
            </View>

            {/* View Replies Button */}
            {hasReplies && (
              <TouchableOpacity
                style={styles.viewRepliesButton}
                onPress={() => toggleReplies(comment.id)}
              >
                <View style={[styles.replyLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.viewRepliesText, { color: colors.textSecondary }]}>
                  {isExpanded ? 'Hide' : 'View'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => handleLike(comment.id)}
          >
            <Heart 
              size={14} 
              color={comment.user_has_liked ? '#FF3B30' : colors.textSecondary}
              fill={comment.user_has_liked ? '#FF3B30' : 'none'}
            />
          </TouchableOpacity>
        </Pressable>

        {/* Render Replies */}
        {hasReplies && isExpanded && (
          <View style={styles.repliesContainer}>
            {comment.replies!.map(reply => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { 
              transform: [{ translateY: slideAnim }],
              backgroundColor: colors.background,
              paddingBottom: insets.bottom
            }
          ]}
        >
          <KeyboardAvoidingView 
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 64 : 230}
            // Keyboard offset for Android is currently hardcoded as 230
          >

          {/* Options Modal for Long Press */}
          <Modal
            visible={showOptionsModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowOptionsModal(false)}
          >
            <Pressable style={styles.optionsOverlay} onPress={() => setShowOptionsModal(false)}>
              <View style={[styles.optionsContainer, { backgroundColor: colors.card, paddingBottom: 32 + insets.bottom }]}> 
                {selectedComment && user?.id === selectedComment.user_id ? (
                  <TouchableOpacity
                    style={styles.optionsItem}
                    onPress={() => {
                      setShowOptionsModal(false);
                      setCommentPendingDelete(selectedComment);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Text style={[styles.optionsItemText, { color: colors.error }]}>Delete Comment</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.optionsItem}
                    onPress={async () => {
                      if (!selectedComment || !user) return;
                      setShowOptionsModal(false);
                      try {
                        const { error } = await supabase
                          .from('comment_reports')
                          .insert({
                            comment_id: selectedComment.id,
                            reporter_id: user.id,
                            reason: 'other',
                            description: 'Reported via quick action',
                          });
                        if (error) {
                          // Ignore duplicate report
                          if ((error as any).code !== '23505') throw error;
                        }
                        Alert.alert('Reported', 'Thanks for your report. Our team will review it.');
                      } catch (e) {
                        console.error('Error reporting comment:', e);
                        Alert.alert('Error', 'Failed to report comment.');
                      }
                    }}
                  >
                    <Text style={[styles.optionsItemText, { color: colors.text }]}>Report Comment</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.optionsItem}
                  onPress={() => setShowOptionsModal(false)}
                >
                  <Text style={[styles.optionsItemText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          <ConfirmModal
            visible={showDeleteConfirm}
            title="Delete Comment"
            message="Are you sure you want to delete this comment? This action cannot be undone."
            onCancel={() => {
              setShowDeleteConfirm(false);
              setCommentPendingDelete(null);
            }}
            onConfirm={async () => {
              if (!commentPendingDelete) return;
              try {
                setDeletingId(commentPendingDelete.id);
                setShowDeleteConfirm(false);
                const { error } = await supabase
                  .from('comments')
                  .delete()
                  .eq('id', commentPendingDelete.id);
                if (error) throw error;
                // Optimistically update local state
                setAllComments(prev => prev.filter(c => c.id !== commentPendingDelete.id && c.parent_comment_id !== commentPendingDelete.id));
                setCommentPendingDelete(null);
              } catch (e) {
                console.error('Error deleting comment:', e);
                Alert.alert('Error', 'Failed to delete comment.');
              } finally {
                setDeletingId(null);
              }
            }}
            confirmButtonTitle="Delete"
            isDestructive
          />
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.commentsContent}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.textSecondary} />
              </View>
            ) : (
              threadedComments.map(comment => renderComment(comment))
            )}
          </ScrollView>

          {/* Input Section */}
            <View style={[styles.inputContainer, { 
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: 48 + insets.bottom
            }]}>
              {replyingTo && (
                <View style={[styles.replyingContainer, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.replyingText, { color: colors.textSecondary }]}>
                    Replying to <Text style={[styles.replyingUsername, { color: colors.text }]}>
                      {replyingTo.profile.username}
                    </Text>
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.inputRow}>
                <Image 
                  source={{ uri: getAvatarUrl(user?.user_metadata?.avatar_url, user?.user_metadata?.username || 'default') }} 
                  style={styles.inputAvatar} 
                />
                
                <TextInput
                  ref={textInputRef}
                  style={[styles.textInput, { 
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border
                  }]}
                  placeholder={replyingTo ? `Reply to ${replyingTo.profile.username}...` : "Add a comment..."}
                  placeholderTextColor={colors.textTertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    commentText.trim() && styles.sendButtonActive
                  ]}
                  onPress={submitComment}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Send 
                      size={16} 
                      color={commentText.trim() ? '#007AFF' : colors.textTertiary} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  optionsContainer: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  optionsItem: {
    paddingVertical: 16,
  },
  optionsItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: screenHeight * 0.7, // Slightly taller for better threading view
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  replyContainer: {
    paddingVertical: 8,
    marginLeft: 44, // Single level of indentation for all replies
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentTextContainer: {
    marginBottom: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  username: {
    fontWeight: '600',
  },
  mentionText: {
    fontWeight: '600',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  likesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  replyLine: {
    width: 24,
    height: 1,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesContainer: {
    // No margin needed here as it's handled by replyContainer style
  },
  likeButton: {
    padding: 8,
    marginLeft: 8,
  },
  inputContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
  },
  replyingUsername: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonActive: {
    // No special styling needed, just for state tracking
  },
});

export default CommentSystem; 