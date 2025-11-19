import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import CartManager from '@/components/cartManager';

// Import component quản lý Cart (cái mà chúng ta vừa viết với API)
// Đảm bảo bạn đã tạo file components/CartManager.tsx như hướng dẫn trước


export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Chỉ hiển thị 1 component duy nhất là CartManager */}
      {/* CartManager đã bao gồm cả phần Tạo và Danh sách */}
      <CartManager />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40, // Chừa khoảng cách cho thanh trạng thái
  },
});