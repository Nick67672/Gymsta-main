import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedH2, ThemedText, ThemedCaptionText } from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface Order {
  created_at: string;
  buyer: {
    id: string;
    full_name: string;
  } | null;
}

interface Buyer {
  id: string;
  fullName: string;
  orderCount: number;
  lastOrderDate: string;
}

export default function BuyersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllOrders = async () => {
    if (!user) {
      setError("You must be logged in to view your buyers.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          created_at,
          buyer:buyer_id (id, full_name)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data as unknown as Order[]);
    } catch (e: any) {
      setError(`Failed to fetch buyers: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllOrders().finally(() => setRefreshing(false));
  }, [user]);

  const buyers = useMemo<Buyer[]>(() => {
    if (!orders) return [];

    const buyersMap = new Map<string, Buyer>();

    orders.forEach(order => {
      if (order.buyer) {
        const existingBuyer = buyersMap.get(order.buyer.id);
        if (existingBuyer) {
          existingBuyer.orderCount += 1;
        } else {
          buyersMap.set(order.buyer.id, {
            id: order.buyer.id,
            fullName: order.buyer.full_name,
            orderCount: 1,
            lastOrderDate: new Date(order.created_at).toLocaleDateString(),
          });
        }
      }
    });

    return Array.from(buyersMap.values());
  }, [orders]);

  if (loading) {
    return <ThemedView style={styles.container}><ActivityIndicator size="large" /></ThemedView>;
  }

  if (error) {
    return <ThemedView style={styles.container}><ThemedText>Error: {error}</ThemedText></ThemedView>;
  }
  
  const renderBuyerItem = ({ item }: { item: Buyer }) => (
    <TouchableOpacity style={styles.buyerItem} onPress={() => router.push(`/profile/${item.id}`)}>
      <View>
        <ThemedH2>{item.fullName}</ThemedH2>
        <ThemedText>{item.orderCount} order{item.orderCount > 1 ? 's' : ''}</ThemedText>
      </View>
      <ThemedCaptionText>Last order: {item.lastOrderDate}</ThemedCaptionText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedH2 style={styles.title}>My Buyers</ThemedH2>
      <FlatList
        data={buyers}
        keyExtractor={(item) => item.id}
        renderItem={renderBuyerItem}
        ListEmptyComponent={<ThemedText>You have no past buyers yet.</ThemedText>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  buyerItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
}); 