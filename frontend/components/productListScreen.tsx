import { getFullImageUrl } from '@/common/function/getImageUrl';
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from 'react-native';

// Enum và Constants giữ nguyên...
export enum ProductCategory {
  MEAT_SEAFOOD = 'MEAT_SEAFOOD',
  FRESH_PRODUCE = 'FRESH_PRODUCE',
  DRINKS = 'DRINKS',
  SPICES_PANTRY = 'SPICES_PANTRY',
  DAIRY = 'DAIRY',
  SNACKS = 'SNACKS',
  FROZEN = 'FROZEN',
  HOUSEHOLD = 'HOUSEHOLD',
  OTHER = 'OTHER',
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'Tất cả',
  [ProductCategory.MEAT_SEAFOOD]: 'Thịt & Hải sản',
  [ProductCategory.FRESH_PRODUCE]: 'Rau củ quả',
  [ProductCategory.DRINKS]: 'Đồ uống',
  [ProductCategory.SPICES_PANTRY]: 'Gia vị & Đồ khô',
  [ProductCategory.DAIRY]: 'Sữa',
  [ProductCategory.SNACKS]: 'Bánh kẹo',
  [ProductCategory.FROZEN]: 'Đồ đông lạnh',
  [ProductCategory.HOUSEHOLD]: 'Gia dụng',
  [ProductCategory.OTHER]: 'Khác',
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Props {
  cartId: number;
  onItemAdded: () => void;
}

export default function ProductListScreen({ cartId, onItemAdded }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  // --- State cho Phân trang ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false); // Cho tính năng kéo để refresh

  // 1. Khi đổi Category -> Reset về trang 1 và tải lại
  useEffect(() => {
    fetchProducts(1, true);
  }, [selectedCategory]);

  // Hàm tải dữ liệu
  // pageNum: Trang cần tải
  // isRefresh: True nếu là hành động reset (đổi category hoặc pull-to-refresh)
  const fetchProducts = async (pageNum: number, isRefresh = false) => {
    if (loading) return; // Tránh gọi trùng lặp
    setLoading(true);

    try {
      let url = `${API_URL}/product?page=${pageNum}`; // Dùng pageNum truyền vào
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;

      console.log('Fetching:', url);

      const response = await fetch(url);
      const json = await response.json();

      if (json.data) {
        if (isRefresh) {
          // Nếu là làm mới -> Ghi đè dữ liệu cũ
          setProducts(json.data);
        } else {
          // Nếu là tải thêm -> Nối vào dữ liệu cũ
          setProducts(prev => [...prev, ...json.data]);
        }

        // Cập nhật thông tin phân trang từ API
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
          setPage(pageNum); // Cập nhật trang hiện tại
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Hàm xử lý khi cuộn xuống đáy (Load More)
  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      fetchProducts(page + 1, false); // Tải trang tiếp theo
    }
  };

  // 3. Hàm xử lý kéo xuống để làm mới (Pull to refresh)
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true); // Tải lại trang 1
  };

  const updateQuantity = (id: number, delta: number) => {
    setQuantities(prev => {
      const currentQty = prev[id] || 1;
      return { ...prev, [id]: Math.max(1, currentQty + delta) };
    });
  };

  // Hàm thêm vào giỏ (Đã dùng endpoint đúng /cart-items)
  const handleAddToCart = async (item: any) => {
    const qty = quantities[item.id] || 1;
    try {
      const payload = {
        cart_id: cartId,
        product_id: item.id,
        quantity: qty
      };

      const res = await fetch(`${API_URL}/product/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Thành công", `Đã thêm ${qty} ${item.name}`);
        onItemAdded();
      } else {
        const errorText = await res.text();
        Alert.alert("Lỗi", "Không thể thêm sản phẩm: " + errorText);
      }
    } catch (error) {
      console.error("Lỗi mạng:", error);
      Alert.alert("Lỗi mạng", "Không thể kết nối tới server");
    }
  };

  // Component hiển thị loading ở dưới đáy khi đang tải thêm
  const renderFooter = () => {
    if (!loading || products.length === 0) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const qty = quantities[item.id] || 1;
    return (
      <View style={styles.card}>
        <Image source={{ uri: getFullImageUrl(item.img_url) || 'https://via.placeholder.com/150' }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.categoryLabel}>{CATEGORY_LABELS[item.category]}</Text>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>{parseFloat(item.price).toLocaleString('vi-VN')} ₫</Text>

          <View style={styles.actionRow}>
            <View style={styles.qtyContainer}>
              <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(item)}>
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Thanh Category */}
      <View style={{ paddingVertical: 10, backgroundColor: 'white' }}>
        <FlatList
          data={['ALL', ...Object.values(ProductCategory)]}
          horizontal showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, selectedCategory === item && styles.catChipSelected]}
              onPress={() => setSelectedCategory(item as string)}>
              <Text style={selectedCategory === item ? { color: '#007AFF' } : { color: '#666' }}>{CATEGORY_LABELS[item as string] || item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Danh sách sản phẩm */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        contentContainerStyle={{ padding: 10 }}
        keyExtractor={(item) => item.id.toString()} // Key quan trọng

        // --- CẤU HÌNH PHÂN TRANG ---
        onEndReached={handleLoadMore} // Gọi hàm khi cuộn xuống đáy
        onEndReachedThreshold={0.5}   // Gọi khi còn cách đáy 50% chiều dài

        // --- LOADING & EMPTY ---
        ListFooterComponent={renderFooter} // Loading xoay xoay ở đáy
        ListEmptyComponent={!loading ? <Text style={{ textAlign: 'center', marginTop: 20 }}>Không có sản phẩm</Text> : null}

        // --- PULL TO REFRESH ---
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 10, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  infoContainer: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  categoryLabel: { fontSize: 10, color: '#888' },
  name: { fontWeight: '600' },
  price: { fontWeight: 'bold', color: '#d32f2f' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  qtyContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 5, alignItems: 'center' },
  qtyBtn: { paddingHorizontal: 8 },
  qtyText: { paddingHorizontal: 5 },
  addBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 5 },
  addBtnText: { color: 'white', fontSize: 12 },
  catChip: { padding: 8, marginHorizontal: 5, backgroundColor: '#eee', borderRadius: 20 },
  catChipSelected: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: '#007AFF' }
});