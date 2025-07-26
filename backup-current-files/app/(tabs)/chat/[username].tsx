import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated, Modal } from 'react-native';
import { ArrowLeft, Send, CircleCheck as CheckCircle2, MoreVertical, Trash2, MessageSquareX } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';
import { goBack } from '@/lib/goBack';
import { Spacing } from '@/constants/Spacing';
import { SharedPost } from '@/components/SharedPost';
import { HapticPatterns } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import PRCelebration from '@/components/PRCelebration';
import ReactionPicker from '@/components/ReactionPicker';

interface Reaction {
  id: string;
  user_id: string;
  reaction: string;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  chat_id: string;
  message_type: 'text' | 'post';
  post_id?: string;
  reactions?: Reaction[];
}

interface Profile {
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_active?: boolean;
}

export default function UserProfileScreen() {
  const { username, avatarUrl } = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { isAuthenticated, showAuthModal } = useAuth();
  const { isUserBlocked } = useBlocking();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<Profile | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByRecipient, setBlockedByRecipient] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setLoading(false);
      router.replace('/auth');
      return;
    }
    
    // Get current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  // Load chat when currentUserId is available
  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;

    const loadChat = async () => {
      try {
        setLoading(true);
        
        // Get recipient's profile
        const { data: recipient, error: recipientError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_verified, is_active')
          .eq('username', username)
          .single();

        if (recipientError) throw recipientError;
        if (!recipient) throw new Error('Recipient not found');

        setRecipientId(recipient.id);
        setRecipientProfile({
          username: recipient.username,
          avatar_url: recipient.avatar_url,
          is_verified: recipient.is_verified,
          is_active: recipient.is_active,
        });

        // Check if user is blocked or has blocked the recipient
        const userBlocked = isUserBlocked(recipient.id);
        setIsBlocked(userBlocked);

        // Check if recipient has blocked the current user
        const { data: blockedByData, error: blockedByError } = await supabase
          .from('blocked_users')
          .select('id')
          .eq('blocker_id', recipient.id)
          .eq('blocked_id', currentUserId)
          .maybeSingle();

        if (blockedByError && blockedByError.code !== '42P01') {
          console.error('Error checking blocked status:', blockedByError);
        }

        const blockedByRecipientStatus = !!blockedByData;
        setBlockedByRecipient(blockedByRecipientStatus);

        // If blocked in either direction, show alert and return to chat list
        if (userBlocked || blockedByRecipientStatus) {
          Alert.alert(
            'Unable to Message',
            userBlocked 
              ? 'You have blocked this user. Unblock them to send messages.'
              : 'This user has blocked you and you cannot send them messages.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/chat')
              }
            ]
          );
          setLoading(false);
          return;
        }

        // Continue with loading chat if not blocked
        // First, check if there's an existing chat where both users are participants
        const { data: existingChats, error: chatsError } = await supabase
          .from('a_chat_users')
          .select('chat_id')
          .eq('user_id', currentUserId);

        if (chatsError) throw chatsError;

        if (existingChats && existingChats.length > 0) {
          const chatIds = existingChats.map(chat => chat.chat_id);
          
          const { data: sharedChat, error: sharedError } = await supabase
            .from('a_chat_users')
            .select('chat_id')
            .eq('user_id', recipient.id)
            .in('chat_id', chatIds)
            .maybeSingle();

          if (sharedError) throw sharedError;

          if (sharedChat) {
            setChatId(sharedChat.chat_id);
            await loadMessages(sharedChat.chat_id);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading chat:', err);
        setLoading(false);
      }
    };

    loadChat();

    const profileSubscription = supabase
      .channel(`profiles:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${recipientId}`,
        },
        (payload) => {
          setRecipientProfile((prev) => ({ ...prev, ...payload.new } as Profile));
        }
      )
      .subscribe();


    return () => {
      profileSubscription.unsubscribe();
    };
  }, [currentUserId, username, isAuthenticated, isUserBlocked, recipientId]);

  useEffect(() => {
    if (!chatId) return;

    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'a_chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          handleNewMessage(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions',
          filter: `message_id=in.(${messages.map(m => m.id).join(',')})`,
        },
        () => {
          loadMessages(chatId);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId, messages]); // Added messages to dependency array

  const handleNewMessage = (newMessage: Message) => {
    console.log('Received new message:', newMessage);
    
    // Avoid adding duplicates and own messages coming via subscription
    if (messages.some((msg) => msg.id === newMessage.id) || newMessage.user_id === currentUserId) {
      console.log('Ignoring duplicate or own message');
      return;
    }
    
    console.log('Adding new message to state');
    setMessages((prev) => [...prev, newMessage]);
    HapticPatterns.messageReceived();

    if (newMessage.message_type === 'post' && newMessage.post_id) {
      console.log('New message is a shared post, checking if PR...');
      // Check if the post is a PR
      supabase
        .from('posts')
        .select('is_pr')
        .eq('id', newMessage.post_id)
        .single()
        .then(({ data }) => {
          console.log('Post PR status:', data);
          if (data?.is_pr) {
            console.log('Showing PR celebration');
            setShowPRCelebration(true);
          }
        });
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const loadMessages = async (chat_id: string) => {
    try {
      console.log('Loading messages for chat:', chat_id);
      
      const { data: messages, error: messagesError } = await supabase
        .from('a_chat_messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      console.log('Raw messages loaded:', messages);

      const messagesWithReactions = await Promise.all(
        (messages || []).map(async (message) => {
          const { data: reactions, error: reactionsError } = await supabase
            .from('chat_message_reactions')
            .select('*')
            .eq('message_id', message.id);

          if (reactionsError) {
            console.error('Error loading reactions for message:', message.id, reactionsError);
            throw reactionsError;
          }
          
          const messageWithReactions = { ...message, reactions };
          console.log('Message with reactions:', messageWithReactions);
          return messageWithReactions;
        })
      );
      
      console.log('Final messages with reactions:', messagesWithReactions);
      setMessages(messagesWithReactions);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !currentUserId || !recipientId || !isAuthenticated) return;
    
    // Double-check blocking status before sending
    if (isBlocked || blockedByRecipient) {
      Alert.alert(
        'Unable to Send Message',
        isBlocked 
          ? 'You have blocked this user. Unblock them to send messages.'
          : 'This user has blocked you and you cannot send them messages.'
      );
      return;
    }

    setSending(true);
    setError(null);
    HapticPatterns.buttonPress();

    try {
      let currentChatId = chatId;

      if (!currentChatId) {
        // Create a new chat
        const { data: newChat, error: chatError } = await supabase
          .from('a_chat')
          .insert({
            last_message: message.trim(),
          })
          .select()
          .single();

        if (chatError) throw chatError;
        if (!newChat) throw new Error('Failed to create chat');

        currentChatId = newChat.id;
        setChatId(currentChatId);

        // Get the next available ID for chat users
        const { data: maxId } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const nextId = (maxId?.id || 0) + 1;

        // Add chat participants with sequential IDs
        const { error: participantsError } = await supabase
          .from('a_chat_users')
          .insert([
            { id: nextId, chat_id: currentChatId, user_id: currentUserId },
            { id: nextId + 1, chat_id: currentChatId, user_id: recipientId }
          ]);

        if (participantsError) throw participantsError;
      } else {
        // Update existing chat's last message
        const { error: updateError } = await supabase
          .from('a_chat')
          .update({ last_message: message.trim() })
          .eq('id', currentChatId);

        if (updateError) throw updateError;
      }

      // Add the message
      const { data: newMessage, error: messageError } = await supabase
        .from('a_chat_messages')
        .insert({
          chat_id: currentChatId,
          user_id: currentUserId,
          message: message.trim(),
          message_type: 'text',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update messages list
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);
        // Scroll to bottom after new message
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      // Clear the input
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (text: string) => {
    setMessage(text);
    // Simulate typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setDeletingMessage(messageId);
      
      const { error } = await supabase
        .from('a_chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', currentUserId); // Only allow deleting own messages

      if (error) throw error;

      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setShowMessageOptions(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    } finally {
      setDeletingMessage(null);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId || !currentUserId) return;

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this entire conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the chat row *before* removing chat_user links so RLS still sees us as a participant.
              const { error: chatError } = await supabase
                .from('a_chat')
                .delete()
                .eq('id', chatId);

              if (chatError) throw chatError;

              // Finally, delete chat users (clean‐up; ignore error if already removed)
              await supabase
                .from('a_chat_users')
                .delete()
                .eq('chat_id', chatId);

              // Navigate back to chat list
              router.replace('/chat');
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete conversation. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLongPressMessage = (message: Message) => {
    setSelectedMessage(message);
    if (message.user_id === currentUserId) {
      setShowMessageOptions(true);
    } else {
      setShowReactionPicker(true);
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!selectedMessage || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('chat_message_reactions')
        .insert({
          message_id: selectedMessage.id,
          user_id: currentUserId,
          reaction: emoji,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending reaction:', err);
    } finally {
      setShowReactionPicker(false);
      setSelectedMessage(null);
    }
  };

  if (!isAuthenticated) {
    return null; // Will be redirected in useEffect
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  if (isBlocked || blockedByRecipient) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isBlocked ? 'User Blocked' : 'Cannot Message'}
          </Text>
        </View>
        <View style={styles.blockedContainer}>
          <Text style={[styles.blockedText, { color: colors.text }]}>
            {isBlocked 
              ? 'You have blocked this user. Unblock them to send messages.'
              : 'This user has blocked you and you cannot send them messages.'
            }
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled
      >
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          style={[styles.header, { borderBottomColor: colors.border }]}
        >
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
          {recipientProfile && (
            <TouchableOpacity 
              style={styles.profileHeader} 
              activeOpacity={0.8}
              onPress={() => router.push(`/${recipientProfile.username}`)}
            >
                <Image
                source={{ uri: recipientProfile.avatar_url || `https://source.unsplash.com/random/40x40/?portrait&${recipientId}` }}
                  style={styles.avatar}
                />
              <View style={styles.usernameWrapper}>
                <Text style={[styles.username, { color: '#FFFFFF' }]} numberOfLines={1}>
                  {recipientProfile.username}
                </Text>
                {recipientProfile.is_active && <View style={styles.activeDot} />}
                {recipientProfile.is_verified && (
                  <CheckCircle2 size={16} color="#fff" fill="#3B82F6" style={{ marginLeft: 4 }} />
                )}
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.chatOptionsButton}
            onPress={() => setShowChatOptions(true)}
            activeOpacity={0.8}>
            <MoreVertical size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}>
          
          {messages.length > 0 ? (
            messages.map((msg, index) => {
              const isCurrentUser = msg.user_id === currentUserId;
              const isLastMessage = index === messages.length - 1;
              const showAvatar = !isCurrentUser && (index === messages.length - 1 || messages[index + 1]?.user_id !== msg.user_id);
              
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer
                  ]}>
                  
                  {/* Avatar for received messages */}
                  {showAvatar && !isCurrentUser && (
                    <Image
                      source={{
                        uri: avatarUrl as string ||
                          `https://source.unsplash.com/random/100x100/?portrait&${username}`
                      }}
                      style={styles.messageAvatar}
                    />
                  )}
                  
                  {/* Message Bubble */}
                  {(msg.message || (msg.message_type === 'post' && msg.post_id)) && (
                    <TouchableOpacity
                      style={[
                        styles.messageBubble,
                        isCurrentUser
                          ? null // Remove default styling for gradient
                          : [styles.receivedMessage, { backgroundColor: colors.card }],
                        !showAvatar && !isCurrentUser && styles.messageWithoutAvatar,
                      ]}
                      onLongPress={() => handleLongPressMessage(msg)}
                      activeOpacity={0.8}
                      disabled={!isCurrentUser}
                    >
                      {isCurrentUser ? (
                        <LinearGradient
                          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
                          style={[styles.messageBubble, styles.sentMessage]}
                        >
                          {msg.message_type === 'post' && msg.post_id ? (
                            <SharedPost postId={msg.post_id} message={msg.message} colors={{...colors, text: '#FFFFFF'}} />
                          ) : (
                            <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
                              {msg.message}
                            </Text>
                          )}
                          <View style={styles.messageFooter}>
                            <Text style={[styles.messageTime, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                              {formatTime(msg.created_at)}
                            </Text>
                            <View style={styles.messageStatus}>
                              <Text style={styles.messageStatusText}>✓</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      ) : (
                        <>
                          {msg.message_type === 'post' && msg.post_id ? (
                            <SharedPost postId={msg.post_id} message={msg.message} colors={colors} />
                          ) : (
                            <Text style={[styles.messageText, { color: colors.text }]}>
                              {msg.message}
                            </Text>
                          )}
                          <View style={styles.messageFooter}>
                            <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                              {formatTime(msg.created_at)}
                            </Text>
                          </View>
                        </>
                      )}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <View style={styles.reactionsContainer}>
                          {msg.reactions.map((reaction) => (
                            <Text key={reaction.id} style={styles.reaction}>
                              {reaction.reaction}
                            </Text>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { 
          borderTopColor: colors.border,
          backgroundColor: colors.background
        }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              placeholder="Message..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
              textAlignVertical="center"
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton, 
                (!message.trim() || sending) && styles.sendButtonDisabled,
                { backgroundColor: message.trim() ? colors.tint : colors.textSecondary }
              ]}
              onPress={handleSend}
              disabled={!message.trim() || sending}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Chat Options Modal */}
      <Modal
        visible={showChatOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChatOptions(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => setShowChatOptions(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: colors.error + '20' }]}
              onPress={() => {
                setShowChatOptions(false);
                handleDeleteChat();
              }}>
              <MessageSquareX size={20} color={colors.error} />
              <Text style={[styles.modalOptionText, { color: colors.error }]}>
                Delete Conversation
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowChatOptions(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Options Modal */}
      <Modal
        visible={showMessageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageOptions(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => setShowMessageOptions(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: colors.error + '20' }]}
              onPress={() => {
                if (selectedMessage) {
                  Alert.alert(
                    'Delete Message',
                    'Are you sure you want to delete this message?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDeleteMessage(selectedMessage.id)
                      }
                    ]
                  );
                }
              }}
              disabled={deletingMessage === selectedMessage?.id}>
              {deletingMessage === selectedMessage?.id ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Trash2 size={20} color={colors.error} />
              )}
              <Text style={[styles.modalOptionText, { color: colors.error }]}>
                {deletingMessage === selectedMessage?.id ? 'Deleting...' : 'Delete Message'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowMessageOptions(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPRCelebration && (
        <PRCelebration onAnimationComplete={() => setShowPRCelebration(false)} />
      )}
      {showReactionPicker && (
        <ReactionPicker
          onSelect={handleSelectReaction}
          onClose={() => setShowReactionPicker(false)}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 12,
    marginRight: 16,
    borderRadius: 12,
  },
  profileHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  usernameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: '700', // Bolder font weight
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecc71', // A nice green color
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 24,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: '20%',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    marginBottom: 6,
  },
  messageBubble: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
    justifyContent: 'center',
  },
  sentMessage: {
    borderBottomRightRadius: 8,
  },
  receivedMessage: {
    borderBottomLeftRadius: 8,
  },
  messageWithoutAvatar: {
    marginLeft: 44,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  messageStatus: {
    marginLeft: 8,
  },
  messageStatusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  reaction: {
    fontSize: 16,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blockedText: {
    textAlign: 'center',
    fontSize: 16,
  },
  chatOptionsButton: {
    padding: 12,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});