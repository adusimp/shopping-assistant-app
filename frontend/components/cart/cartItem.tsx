// src/components/cart/CartItemRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFullImageUrl } from '@/common/function/getImageUrl'; // Nhớ check đường dẫn import này của bạn

// 1. Định nghĩa Interface cho Props truyền vào
interface CartItem {
  product_id: number;
  name: string;
  img_url: string;
  quantity: number;
  total_price: string;
  is_bought: boolean;
}

interface CartItemRowProps {
  item: CartItem;
  onToggle: (item: CartItem) => void;       // Hàm xử lý khi tích chọn
  onCheckPrice: (item: CartItem) => void;   // Hàm mở modal AI
  onDelete: (id: number) => void;           // Hàm xóa item
}

// Helper format tiền (để cục bộ hoặc import từ util)
const formatCurrency = (price: string | number) => {
  const numberPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numberPrice)) return '0 ₫';
  return numberPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export const CartItemRow = ({ item, onToggle, onCheckPrice, onDelete }: CartItemRowProps) => {
  return (
    <View style={[
        styles.itemRow, 
        item.is_bought && { backgroundColor: '#f9f9f9', opacity: 0.7 }
    ]}>
      
      {/* --- NÚT CHECKBOX (TRÁI) --- */}
      <TouchableOpacity 
        onPress={() => onToggle(item)}
        style={{ padding: 5, marginRight: 5 }}
      >
        <Ionicons 
            name={item.is_bought ? "checkbox" : "square-outline"} 
            size={24} 
            color={item.is_bought ? "#34C759" : "#ccc"} 
        />
      </TouchableOpacity>

      {/* Ảnh sản phẩm */}
      <Image
        source={{ uri: getFullImageUrl(item.img_url) || 'https://via.placeholder.com/50' }}
        style={styles.itemImage}
        resizeMode="cover"
      />

      {/* Thông tin tên và số lượng */}
      <View style={styles.itemInfo}>
        <Text 
            style={[
                styles.itemName, 
                item.is_bought && { textDecorationLine: 'line-through', color: '#999' }
            ]} 
            numberOfLines={2}
        >
            {item.name || 'Sản phẩm'}
        </Text>
        <Text style={styles.itemQuantity}>Số lượng: x{item.quantity}</Text>
        
        {/* Nút check giá AI */}
        <TouchableOpacity onPress={() => onCheckPrice(item)} style={{marginTop: 5, flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="pricetags-outline" size={14} color="#007AFF" />
            <Text style={{fontSize: 12, color: '#007AFF', marginLeft: 4}}>Check giá AI</Text>
        </TouchableOpacity>
      </View>

      {/* Cột bên phải: Giá và Xóa */}
      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
        <Text style={[
            styles.itemPrice,
            item.is_bought && { color: '#999' }
        ]}>
            {formatCurrency(item.total_price)}
        </Text>
        
        <TouchableOpacity 
          style={{ marginTop: 8, padding: 4 }} 
          onPress={() => onDelete(item.product_id)}
        >
          <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: '600' }}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 2. Chuyển Styles liên quan sang đây luôn cho gọn file cha
const styles = StyleSheet.create({
  itemRow: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 15
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666'
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 2
  },
});