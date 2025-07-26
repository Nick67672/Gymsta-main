import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const DebugMessagingSharing: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const { user } = useAuth();

  const testDatabaseStructure = async () => {
    setTesting(true);
    try {
      console.log('=== DATABASE STRUCTURE TEST ===');

      // Test 1: Check if a_chat_messages table exists
      const { data: chatTable, error: chatTableError } = await supabase
        .from('a_chat_messages')
        .select('id')
        .limit(1);

      if (chatTableError) {
        console.error('a_chat_messages table error:', chatTableError);
        Alert.alert('Database Error', `a_chat_messages table issue: ${chatTableError.message}`);
        return;
      }
      console.log('✅ a_chat_messages table exists');

      // Test 2: Check if post_shares table exists
      const { data: sharesTable, error: sharesTableError } = await supabase
        .from('post_shares')
        .select('id')
        .limit(1);

      if (sharesTableError) {
        console.error('post_shares table error:', sharesTableError);
        Alert.alert('Database Error', `post_shares table issue: ${sharesTableError.message}`);
        return;
      }
      console.log('✅ post_shares table exists');

      // Test 3: Try to call the get_post_share_stats function
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_post_share_stats', { post_uuid: '00000000-0000-0000-0000-000000000000' });

      if (statsError) {
        console.error('get_post_share_stats function error:', statsError);
        Alert.alert('Function Error', `get_post_share_stats failed: ${statsError.message}`);
        return;
      }
      console.log('✅ get_post_share_stats function works:', statsData);

      Alert.alert('Database Test', 'All database structure tests passed! ✅');
    } catch (error) {
      console.error('Database test error:', error);
      Alert.alert('Test Error', `Unexpected error: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const testActualMessageSending = async () => {
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setTesting(true);
    try {
      console.log('=== ACTUAL MESSAGE SENDING TEST ===');
      
      // Step 1: Find or create a test chat
      console.log('Step 1: Finding existing chats...');
      const { data: existingChats, error: chatsError } = await supabase
        .from('a_chat_users')
        .select('chat_id, a_chat(id, last_message)')
        .eq('user_id', user.id)
        .limit(1);

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        Alert.alert('Chat Error', `Cannot fetch chats: ${chatsError.message}`);
        return;
      }

      let testChatId = existingChats?.[0]?.chat_id;
      console.log('Found existing chat:', testChatId);

      if (!testChatId) {
        console.log('Step 2: Creating new test chat...');
        // Create a test chat with yourself
        const { data: newChat, error: chatError } = await supabase
          .from('a_chat')
          .insert({ last_message: 'Test message' })
          .select('id')
          .single();

        if (chatError) {
          console.error('Error creating chat:', chatError);
          Alert.alert('Chat Creation Error', `Cannot create chat: ${chatError.message}`);
          return;
        }

        testChatId = newChat.id;
        console.log('Created new chat:', testChatId);

        // Add yourself to the chat
        const { data: maxId } = await supabase
          .from('a_chat_users')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const nextId = (maxId?.id || 0) + 1;

        const { error: usersError } = await supabase
          .from('a_chat_users')
          .insert({ id: nextId, chat_id: testChatId, user_id: user.id });

        if (usersError) {
          console.error('Error adding user to chat:', usersError);
          Alert.alert('Chat Users Error', `Cannot add user to chat: ${usersError.message}`);
          return;
        }
        console.log('Added user to chat');
      }

      // Step 3: Try to send a test message
      console.log('Step 3: Sending test message...');
      const testMessage = `Test message from debug - ${new Date().toISOString()}`;
      
      const { data: newMessage, error: messageError } = await supabase
        .from('a_chat_messages')
        .insert({
          chat_id: testChatId,
          user_id: user.id,
          message: testMessage,
          message_type: 'text',
        })
        .select('*')
        .single();

      if (messageError) {
        console.error('Error sending message:', messageError);
        Alert.alert('Message Send Error', `Cannot send message: ${messageError.message}\n\nThis is likely a permissions issue with RLS policies.`);
        return;
      }

      console.log('✅ Successfully sent test message:', newMessage);

      // Step 4: Update chat last message
      console.log('Step 4: Updating chat last message...');
      const { error: updateError } = await supabase
        .from('a_chat')
        .update({ last_message: testMessage })
        .eq('id', testChatId);

      if (updateError) {
        console.error('Error updating chat:', updateError);
        Alert.alert('Chat Update Error', `Cannot update chat: ${updateError.message}`);
        return;
      }

      console.log('✅ Successfully updated chat');
      Alert.alert('Message Test Success! ✅', 'Test message was sent successfully. Regular messaging should work now.');

    } catch (error) {
      console.error('Message test error:', error);
      Alert.alert('Test Error', `Unexpected error: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const testActualSharing = async () => {
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    setTesting(true);
    try {
      console.log('=== ACTUAL SHARING TEST ===');
      
      // Step 1: Find a real post to test with
      console.log('Step 1: Finding a test post...');
      const { data: testPost, error: postError } = await supabase
        .from('posts')
        .select('id, user_id')
        .limit(1)
        .single();

      if (postError || !testPost) {
        console.error('Error finding test post:', postError);
        Alert.alert('Post Error', 'No posts found to test sharing with. Create a post first.');
        return;
      }

      console.log('Found test post:', testPost.id);

      // Step 2: Try to create a share record
      console.log('Step 2: Creating share record...');
      const { data: shareRecord, error: shareError } = await supabase
        .from('post_shares')
        .insert({
          post_id: testPost.id,
          sharer_id: user.id,
          share_type: 'external_link',
          share_medium: 'copy',
          message: 'Test share from debug'
        })
        .select('*')
        .single();

      if (shareError) {
        console.error('Error creating share:', shareError);
        Alert.alert('Share Creation Error', `Cannot create share: ${shareError.message}\n\nThis is likely a permissions issue with RLS policies.`);
        return;
      }

      console.log('✅ Successfully created share record:', shareRecord);

      // Step 3: Test the get_post_share_stats function with real data
      console.log('Step 3: Testing share stats function...');
      const { data: shareStats, error: statsError } = await supabase
        .rpc('get_post_share_stats', { post_uuid: testPost.id });

      if (statsError) {
        console.error('Error getting share stats:', statsError);
        Alert.alert('Share Stats Error', `Cannot get share stats: ${statsError.message}`);
        return;
      }

      console.log('✅ Successfully got share stats:', shareStats);

      // Step 4: Test sharing to chat (if we have a chat)
      console.log('Step 4: Testing chat sharing...');
      const { data: existingChats, error: chatsError } = await supabase
        .from('a_chat_users')
        .select('chat_id')
        .eq('user_id', user.id)
        .limit(1);

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        Alert.alert('Chat Error', `Cannot fetch chats: ${chatsError.message}`);
        return;
      }

      if (existingChats && existingChats.length > 0) {
        const testChatId = existingChats[0].chat_id;
        console.log('Testing with existing chat:', testChatId);

        const { data: chatMessage, error: chatMessageError } = await supabase
          .from('a_chat_messages')
          .insert({
            chat_id: testChatId,
            user_id: user.id,
            message_type: 'post',
            post_id: testPost.id,
            message: 'Test shared post from debug'
          })
          .select('*')
          .single();

        if (chatMessageError) {
          console.error('Error sharing to chat:', chatMessageError);
          Alert.alert('Chat Share Error', `Cannot share to chat: ${chatMessageError.message}`);
          return;
        }

        console.log('✅ Successfully shared to chat:', chatMessage);
      }

      Alert.alert('Sharing Test Success! ✅', 'All sharing functionality is working correctly.');

    } catch (error) {
      console.error('Sharing test error:', error);
      Alert.alert('Test Error', `Unexpected error: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug Messaging & Sharing</Text>
      
      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testDatabaseStructure}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Database Structure'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testActualMessageSending}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Actual Message Sending'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testActualSharing}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Actual Sharing'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        💡 This will test the actual functionality step by step and show you exactly where any issues occur.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 