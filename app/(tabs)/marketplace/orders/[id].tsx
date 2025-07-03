import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
  Alert,
} from "react-native";

type OrderDetails = {
  id: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  shipping_address: string | null;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  products: {
    name: string;
    price: number;
    image_url: string;
  } | null;
  buyer: {
    username: string;
  } | null;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          created_at,
          shipping_address,
          tracking_number,
          carrier,
          tracking_url,
          products (*),
          buyer:buyer_id (username)
        `
        )
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      
      setOrder(data as any);
      setTrackingNumber(data.tracking_number || "");
      setCarrier(data.carrier || "");
      setTrackingUrl(data.tracking_url || "");
    } catch (e: any) {
      setError(`Failed to fetch order details: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const handleUpdate = async (fieldsToUpdate: Partial<OrderDetails>) => {
    setIsUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update(fieldsToUpdate)
        .eq("id", id);
      
      if (updateError) throw updateError;

      // Refresh data
      await fetchOrderDetails();
      Alert.alert("Success", "Order updated successfully!");

    } catch (e: any) {
      Alert.alert("Error", `Failed to update order: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}><ActivityIndicator size="large" /></ThemedView>
    );
  }

  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error: {error || "Order not found."}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Order Details</Text>

      <View style={styles.card}>
        <Text>Order ID: {order.id.substring(0,8)}</Text>
        <Text>Product: {order.products?.name}</Text>
        <Text>Buyer: {order.buyer?.username}</Text>
        <Text>Status: {order.status}</Text>
        <Text>Shipping Address: {order.shipping_address}</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.subtitle}>Update Tracking Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Tracking Number"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Carrier (e.g., FedEx)"
          value={carrier}
          onChangeText={setCarrier}
        />
        <TextInput
          style={styles.input}
          placeholder="Tracking URL"
          value={trackingUrl}
          onChangeText={setTrackingUrl}
        />
        <Button 
          title="Save Tracking Info & Mark as Shipped"
          onPress={() => handleUpdate({ 
            tracking_number: trackingNumber,
            carrier,
            tracking_url: trackingUrl,
            status: 'shipped'
          })}
          disabled={isUpdating}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>Update Status</Text>
        <View style={styles.buttonGroup}>
          <Button title="Mark as Processing" onPress={() => handleUpdate({ status: 'processing' })} disabled={isUpdating || order.status === 'processing'}/>
          <Button title="Mark as Delivered" onPress={() => handleUpdate({ status: 'delivered' })} disabled={isUpdating || order.status === 'delivered'}/>
          <Button title="Cancel Order" color="red" onPress={() => handleUpdate({ status: 'cancelled' })} disabled={isUpdating || order.status === 'cancelled'}/>
        </View>
      </View>

      <View style={[styles.card, {marginTop: 20}]}>
          <Button title="Message Buyer" onPress={() => Alert.alert("Coming Soon", "Chat functionality will be implemented here.")} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 10
  }
}); 