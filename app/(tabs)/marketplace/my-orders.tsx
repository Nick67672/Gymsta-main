import { ThemedH2, ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Link } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/Colors";
import { ArrowLeft } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

// This type can be shared or moved to a types file
type Order = {
  id: string;
  status: string;
  created_at: string;
  products: {
    name: string;
    image_url: string;
  } | null;
  seller: {
    username: string;
  } | null;
};

export default function MyOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const fetchOrders = async () => {
    if (!user) {
      setError("You must be logged in to view your orders.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          created_at,
          products (name, image_url),
          seller:seller_id (username)
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setOrders(data as unknown as Order[]);
      setError(null);
    } catch (e: any) {
      setError(`Failed to fetch orders: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, [user]);

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedH2>Error</ThemedH2>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Link href={`/marketplace/orders/${item.id}`} asChild>
      <TouchableOpacity style={styles.orderItem}>
        <View>
          <Text style={styles.productName}>
            {item.products?.name || "Product not found"}
          </Text>
          <Text style={styles.sellerName}>
            Sold by: {item.seller?.username || "N/A"}
          </Text>
          <Text style={styles.orderId}>Order ID: {item.id.substring(0, 8)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text
            style={[styles.status, styles[`status_${item.status}` as keyof typeof styles]]}
          >
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedH2>My Orders</ThemedH2>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  orderItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sellerName: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  orderId: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  status: {
    fontWeight: "bold",
    textTransform: 'capitalize',
  },
  status_pending: { color: "#FFA500" }, // Orange
  status_processing: { color: "#0000FF" }, // Blue
  status_shipped: { color: "#008000" }, // Green
  status_delivered: { color: "#4B0082" }, // Indigo
  status_cancelled: { color: "#FF0000" }, // Red
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
}); 