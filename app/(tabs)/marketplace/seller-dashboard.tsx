import { ThemedH2, ThemedText, ThemedSecondaryText } from "@/components/ThemedText";
import { ThemedView, ThemedCardView, ThemedGradientView } from "@/components/ThemedView";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { ThemedButton } from "@/components/ThemedButton";
import { Edit3, Trash2, ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/Colors";
import { goBack } from '@/lib/goBack';

// Define the Order type based on our schema
type Order = {
  id: string;
  status: string;
  created_at: string;
  products: {
    name: string;
  } | null;
  buyer: {
    username: string;
  } | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
};

export default function SellerDashboardScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [activeView, setActiveView] = useState<'orders' | 'products'>('orders');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`id, status, created_at, products (name), buyer:buyer_id (username)`)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data as any);
    } catch (e: any) {
      setError(`Failed to fetch orders: ${e.message}`);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data as Product[]);
    } catch (e: any) {
      setError(`Failed to fetch products: ${e.message}`);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setError("You must be logged in.");
      setLoadingOrders(false);
      setLoadingProducts(false);
      return;
    }
    fetchOrders();
    fetchProducts();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchProducts()]);
    setRefreshing(false);
  }, [user]);
  
  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              const { error } = await supabase.from('products').delete().eq('id', productId);
              if (error) throw error;
              setProducts(prev => prev.filter(p => p.id !== productId));
              Alert.alert("Success", `"${productName}" has been deleted.`);
            } catch(e: any) {
              setError(`Failed to delete product: ${e.message}`);
              Alert.alert("Error", `Failed to delete product: ${e.message}`);
            }
          },
          style: "destructive" 
        }
      ]
    );
  };

  const renderOrders = () => (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<ThemedSecondaryText style={{ textAlign: 'center', marginTop: 32 }}>You have no orders yet.</ThemedSecondaryText>}
      renderItem={({ item }) => (
        <Link href={`/marketplace/orders/${item.id}`} asChild>
          <TouchableOpacity style={styles.cardTouchable}>
            <ThemedCardView style={styles.orderCard}>
              <View>
                <ThemedText style={styles.productName}>{item.products?.name || "Product not found"}</ThemedText>
                <ThemedSecondaryText>Buyer: {item.buyer?.username || "N/A"}</ThemedSecondaryText>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColorMap[item.status] }]}> 
                <ThemedText style={{ color: '#fff', fontSize: 12, textTransform: 'capitalize' }}>{item.status}</ThemedText>
              </View>
            </ThemedCardView>
          </TouchableOpacity>
        </Link>
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
    />
  );

  const renderProducts = () => (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<ThemedSecondaryText style={{ textAlign: 'center', marginTop: 32 }}>You have no products listed for sale.</ThemedSecondaryText>}
      renderItem={({ item }) => (
        <ThemedCardView style={styles.productCard}>
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <ThemedText style={styles.productName}>{item.name}</ThemedText>
            <ThemedSecondaryText style={styles.productPrice}>${item.price.toFixed(2)}</ThemedSecondaryText>
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity onPress={() => router.push(`/marketplace/edit-product/${item.id}`)}>
              <Edit3 size={20} color={colors.tint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteProduct(item.id, item.name)}>
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </ThemedCardView>
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
    />
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedGradientView gradient="primary" style={styles.gradientHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')} hitSlop={{top:10,left:10,right:10,bottom:10}}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <ThemedH2 style={{ color: '#fff', fontSize: 22 }}>Seller Dashboard</ThemedH2>
          </View>
          <View style={styles.headerActions}>
            <ThemedButton title="List Product" onPress={() => router.push('/(tabs)/marketplace/create-product')} variant="primary" size="small" />
          </View>
        </View>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>{orders.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Orders</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <ThemedText style={styles.statNumber}>{products.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Listings</ThemedText>
          </View>
        </View>
      </ThemedGradientView>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.pill, { backgroundColor: activeView === 'orders' ? colors.tint : colors.backgroundSecondary }]} onPress={() => setActiveView('orders')}>
          <ThemedText style={{ fontWeight: '600', color: activeView === 'orders' ? colors.buttonText : colors.text }}>Orders</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pill, { backgroundColor: activeView === 'products' ? colors.tint : colors.backgroundSecondary }]} onPress={() => setActiveView('products')}>
          <ThemedText style={{ fontWeight: '600', color: activeView === 'products' ? colors.buttonText : colors.text }}>Products</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {error && <ThemedText>{error}</ThemedText>}
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
          {activeView === 'orders'
            ? loadingOrders ? <ActivityIndicator/> : renderOrders()
            : loadingProducts ? <ActivityIndicator/> : renderProducts()
          }
        </RefreshControl>
      </View>
    </ThemedView>
  );
}

const statusColorMap: Record<string, string> = {
  pending: '#FFA500',
  processing: '#1E90FF',
  shipped: '#008000',
  delivered: '#4B0082',
  cancelled: '#FF0000',
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  statsContainer: { flexDirection: 'row', marginTop: 24, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 16, padding: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  pill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  cardTouchable: { marginBottom: 12 },
  orderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  productCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1, marginRight: 8, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '600' },
  productPrice: { marginTop: 2 },
  productActions: { flexDirection: 'row', gap: 20, paddingHorizontal: 8 },
}); 