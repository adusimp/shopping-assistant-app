import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,        // <--- 1. Import Modal
  ScrollView,   // <--- 2. Import ScrollView để cuộn trong Modal
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

// TODO: Thay đổi IP này thành IP máy tính của bạn
const API_URL = 'http://172.16.10.141:3000';

// Interface cho Header (Thông tin Cart)
interface CartDetail {
  id: number;
  name: string;
  notify_at: string | null;
}

// Interface Item
interface CartItem {
  product_id: number;
  name: string;
  img_url: string;
  quantity: number;
  total_price: string;
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams();
  const cartId = Array.isArray(id) ? id[0] : id;

  // --- State Header & List ---
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Edit Header
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotify, setEditNotify] = useState('');

  // --- 3. STATE CHO MODAL & FORM THÊM MỚI ---
  const [modalVisible, setModalVisible] = useState(false);
  
  // Các trường dữ liệu nhập liệu
  const [newName, setNewName] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');

  useEffect(() => {
    if (!cartId) return;
    fetchCartDetails();
    fetchCartItems();
  }, [cartId]);

  const fetchCartDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${cartId}`);
      const data = await res.json();
      setCart(data);
      setEditName(data.name);
      setEditNotify(data.notify_at || '');
    } catch (error) {
      console.error('Lỗi lấy chi tiết cart:', error);
    }
  };

  const fetchCartItems = async () => {
    try {
      const res = await fetch(`${API_URL}/product/product-in-cart/${cartId}`);
      const data = await res.json();
      setItems(data);
    } catch (error) {
      console.error('Lỗi lấy items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update Cart Info
  const handleUpdateCart = async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, notify_at: editNotify || null }),
      });
      if (res.ok) {
        Alert.alert('Thành công', 'Đã cập nhật thông tin Cart');
        setIsEditing(false);
        fetchCartDetails();
      }
    } catch (error) { console.error(error); }
  };

  // --- 4. HÀM THÊM SẢN PHẨM (NÂNG CẤP) ---
  const handleAddItem = async () => {
    // Validate đơn giản
    if (!newName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên sản phẩm");
      return;
    }

    try {
      // Tạo payload đầy đủ thông tin
      const payload = {
        cart_id: parseInt(cartId as string),
        name: newName,
        img_url: newImage,
        price: parseFloat(newPrice) || 0,
        category: newCategory,
        quantity: parseInt(newQuantity) || 1
      };

      const res = await fetch(`${API_URL}/cart-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Thành công", "Đã thêm sản phẩm!");
        // Reset form và đóng modal
        setNewName('');
        setNewImage('');
        setNewPrice('');
        setNewCategory('');
        setNewQuantity('1');
        setModalVisible(false);
        
        // Load lại danh sách
        fetchCartItems();
      } else {
        Alert.alert('Lỗi', 'Không thể thêm sản phẩm (Server error)');
      }
    } catch (error) { console.error(error); }
  };

  const formatCurrency = (price: string) => {
    const numberPrice = parseFloat(price);
    return numberPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  // Render Item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      <Image
        source={{ uri: item.img_url || 'https://via.placeholder.com/50' }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemQuantity}>Số lượng: x{item.quantity}</Text>
      </View>
      <Text style={styles.itemPrice}>{formatCurrency(item.total_price)}</Text>
    </View>
  );

  if (loading) return <ActivityIndicator style={styles.centered} size="large" />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: cart?.name || 'Chi tiết' }} />

      {/* Header Info */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Thông Tin Cart</Text>
          <TouchableOpacity onPress={() => isEditing ? handleUpdateCart() : setIsEditing(true)}>
            <Text style={styles.editBtn}>{isEditing ? 'Lưu' : 'Sửa'}</Text>
          </TouchableOpacity>
        </View>
        {isEditing ? (
          <View>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <TextInput style={styles.input} value={editNotify} onChangeText={setEditNotify} placeholder="YYYY-MM-DD..." />
            <TouchableOpacity onPress={() => setIsEditing(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.infoText}>📦 {cart?.name}</Text>
            <Text style={styles.infoText}>⏰ {cart?.notify_at ? new Date(cart.notify_at).toLocaleString('vi-VN') : 'Chưa đặt giờ'}</Text>
          </View>
        )}
      </View>

      {/* Danh sách sản phẩm */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id.toString()}
        renderItem={renderCartItem}
        contentContainerStyle={{ paddingBottom: 100 }} // Chừa chỗ cho nút thêm mới
        ListEmptyComponent={<Text style={styles.emptyText}>Giỏ hàng trống</Text>}
      />

      {/* --- 5. NÚT MỞ MODAL (Ở DƯỚI CÙNG) --- */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.openModalBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.openModalText}>+ Thêm sản phẩm mới</Text>
        </TouchableOpacity>
      </View>

      {/* --- 6. MODAL FORM NHẬP LIỆU --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Sản Phẩm</Text>
            
            <ScrollView>
              <Text style={styles.label}>Tên sản phẩm (*):</Text>
              <TextInput style={styles.modalInput} value={newName} onChangeText={setNewName} placeholder="VD: Bánh kẹo..." />

              <Text style={styles.label}>Link ảnh (URL):</Text>
              <TextInput style={styles.modalInput} value={newImage} onChangeText={setNewImage} placeholder="https://..." />

              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{width: '48%'}}>
                    <Text style={styles.label}>Giá (VNĐ):</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        value={newPrice} 
                        onChangeText={setNewPrice} 
                        keyboardType="numeric" 
                        placeholder="0" 
                    />
                </View>
                <View style={{width: '48%'}}>
                    <Text style={styles.label}>Số lượng:</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        value={newQuantity} 
                        onChangeText={setNewQuantity} 
                        keyboardType="numeric" 
                        placeholder="1" 
                    />
                </View>
              </View>

              <Text style={styles.label}>Loại (Category):</Text>
              <TextInput style={styles.modalInput} value={newCategory} onChangeText={setNewCategory} placeholder="VD: Thực phẩm" />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleAddItem}>
                <Text style={[styles.btnText, {color: 'white'}]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerSection: { backgroundColor: '#fff', padding: 15, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editBtn: { color: '#007AFF', fontSize: 16 },
  infoText: { fontSize: 15, marginBottom: 4, color: '#444' },
  
  // Input trong Header (Sửa Cart)
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 8, backgroundColor: '#fff' },
  cancelText: { color: 'red', textAlign: 'right' },

  // List Item Styles
  itemRow: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  itemImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 2 },
  itemQuantity: { fontSize: 13, color: '#666' },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#FF3B30' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999' },

  // --- Styles cho Nút mở Modal & Modal ---
  bottomContainer: {
    position: 'absolute', bottom: 20, left: 0, right: 0, paddingHorizontal: 20
  },
  openModalBtn: {
    backgroundColor: '#007AFF', padding: 15, borderRadius: 12, alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3.84, elevation: 5,
  },
  openModalText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: 'white', borderRadius: 15, padding: 20, width: '100%', maxHeight: '80%',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  
  // Input trong Modal
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#333', marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
  
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#eee', marginRight: 10 },
  btnSave: { backgroundColor: '#34C759' },
  btnText: { fontSize: 16, fontWeight: '600' }
});