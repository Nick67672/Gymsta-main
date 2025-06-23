import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert, Animated } from 'react-native';
import { ArrowLeft, Send, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useBlocking } from '@/context/BlockingContext';
import Colors from '@/constants/Colors';

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  chat_id: string;
}

interface Profile {
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
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
          .select('id, username, avatar_url, is_verified')
          .eq('username', username)
          .single();

        if (recipientError) throw recipientError;
        if (!recipient) throw new Error('Recipient not found');

        setRecipientId(recipient.id);
        setRecipientProfile({
          username: recipient.username,
          avatar_url: recipient.avatar_url,
          is_verified: recipient.is_verified
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
  }, [currentUserId, username, isAuthenticated, isUserBlocked]);

  const loadMessages = async (chat_id: string) => {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('a_chat_messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messages || []);
      
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
        {/* Enhanced Header */}
        <View style={[styles.header, { 
          borderBottomColor: colors.border,
          backgroundColor: colors.background
        }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri: avatarUrl as string ||
                      `https://source.unsplash.com/random/200x200/?portrait&${username}`
                  }}
                  style={styles.avatar}
                />
                <View style={[styles.onlineIndicator, { backgroundColor: colors.success }]} />
              </View>
              <View style={styles.userInfo}>
                <View style={styles.usernameContainer}>
                  <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
                  {recipientProfile?.is_verified && (
                    <CheckCircle2 size={16} color="#fff" fill="#3B82F6" />
                  )}
                </View>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {isTyping ? 'typing...' : 'online'}
                </Text>
              </View>
            </View>
          </View>


        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Enhanced Messages Container */}
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
                  <View style={[
                    styles.messageBubble,
                    isCurrentUser ? 
                      [styles.sentMessage, { backgroundColor: colors.tint }] : 
                      [styles.receivedMessage, { backgroundColor: colors.card }],
                    !showAvatar && !isCurrentUser && styles.messageWithoutAvatar
                  ]}>
                    <Text style={[
                      styles.messageText,
                      isCurrentUser ? 
                        { color: '#fff' } : 
                        { color: colors.text }
                    ]}>
                      {msg.message}
                    </Text>
                    
                    <View style={styles.messageFooter}>
                      <Text style={[
                        styles.messageTime,
                        isCurrentUser ? 
                          { color: 'rgba(255, 255, 255, 0.8)' } : 
                          { color: colors.textSecondary }
                      ]}>
                        {formatTime(msg.created_at)}
                      </Text>
                      
                      {/* Message Status for sent messages */}
                      {isCurrentUser && (
                        <View style={styles.messageStatus}>
                          <Text style={styles.messageStatusText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </View>
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

        {/* Enhanced Input Container */}
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
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
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentMessage: {
    borderBottomRightRadius: 6,
  },
  receivedMessage: {
    borderBottomLeftRadius: 6,
  },
  messageWithoutAvatar: {
    marginLeft: 36,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  messageStatus: {
    marginLeft: 8,
  },
  messageStatusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
});