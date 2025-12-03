import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import CartManager from '@/components/cartManager'; // Import component quản lý Cart
import { router } from 'expo-router';
import { useUser } from '@/context/userContext';

export default function HomeScreen() {
  const { user } = useUser();

  // Bảo vệ màn hình này: Nếu logout hoặc không có user -> Đá về index (Login)
  useEffect(() => {
    if (!user) {
      router.replace('/'); 
    }
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <CartManager />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40, 
  },
});