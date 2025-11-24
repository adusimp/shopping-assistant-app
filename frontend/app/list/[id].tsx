import React, { useState, useEffect } from 'react';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
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
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView, // Thêm cái này cho form nhập liệu ko bị che
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import ProductListScreen from '@/components/productListScreen';
import { Ionicons } from '@expo/vector-icons'; // Import Icon
import { getFullImageUrl } from '@/common/function/getImageUrl';

// TODO: Thay đổi IP này thành IP máy tính của bạn
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CartDetail {
  id: number;
  name: string;
  notify_at: string | null;
}

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

  // --- State Data ---
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotify, setEditNotify] = useState('');

  // --- State Modal (Đã tách ra làm 2) ---
  const [modalManualVisible, setModalManualVisible] = useState(false); // Modal nhập tay
  const [modalListVisible, setModalListVisible] = useState(false);     // Modal chọn từ kho

  // Form fields (Cho nhập tay)
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

  // --- 2. Hàm chọn ảnh từ thư viện ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
    }
  };

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

  // --- Xử lý thêm thủ công ---
  const handleAddItem = async () => {
    if (!newName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên sản phẩm");
      return;
    }

    try {
      // --- TRƯỜNG HỢP 1: WEB ---
      if (Platform.OS === 'web') {
        const formData = new FormData();
        formData.append('cart_id', String(cartId));
        formData.append('name', newName);
        formData.append('price', String(newPrice || 0));
        formData.append('quantity', String(newQuantity || 1));
        formData.append('category', newCategory || '');

        if (newImage) {
          const response = await fetch(newImage);
          const blob = await response.blob();
          formData.append('file', blob, 'upload.jpg');
        }

        const res = await fetch(`${API_URL}/product/add-product-to-cart`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          Alert.alert("Thành công", "Đã thêm trên Web!");
          resetForm();
        } else {
          const txt = await res.text();
          Alert.alert("Lỗi Web", txt);
        }

      } else {
        // --- TRƯỜNG HỢP 2: MOBILE (Android/iOS) ---
        const textFields = {
          cart_id: String(cartId),
          name: newName,
          price: String(newPrice || 0),
          quantity: String(newQuantity || 1),
          category: newCategory || '',
        };

        if (!newImage) {
          Alert.alert("Lỗi", "Vui lòng chọn ảnh");
          return;
        }

        console.log("Mobile: Đang upload legacy...");

        const uploadResult = await uploadAsync(
          `${API_URL}/product/add-product-to-cart`,
          newImage,
          {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: FileSystemUploadType.MULTIPART,
            parameters: textFields,
          }
        );

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          Alert.alert("Thành công", "Đã thêm trên Mobile!");
          resetForm();
        } else {
          Alert.alert("Lỗi Mobile", "Server trả về: " + uploadResult.body);
        }
      }

    } catch (error) {
      console.error("Lỗi chung:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra: " + error);
    }
  };

  // Reset form thủ công
  const resetForm = () => {
    setModalManualVisible(false); // Đóng modal thủ công
    setNewName(''); setNewImage(''); setNewPrice(''); setNewQuantity('1');
    fetchCartItems();
  };

  const formatCurrency = (price: string) => {
    const numberPrice = parseFloat(price);
    return numberPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  // const getFullImageUrl = (imagePath: string | null) => {
  //   if (!imagePath) return 'https://via.placeholder.com/150';
  //   if (imagePath.startsWith('http')) {
  //     return imagePath;
  //   }
  //   const baseUrl = API_URL?.replace(/\/$/, '');
  //   const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  //   return `${baseUrl}${path}`;
  // };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      <Image
        source={{ uri: getFullImageUrl(item.img_url) || 'https://via.placeholder.com/50' }}
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

      <Stack.Screen
        options={{
          title: cart?.name || 'Chi tiết',
          // --- HEADER VỚI 2 NÚT ---
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              {/* Nút 1: Chọn từ kho (Icon Sách) */}
              <TouchableOpacity onPress={() => setModalListVisible(true)} style={{ padding: 5 }}>
                <Ionicons name="library-outline" size={26} color="#007AFF" />
              </TouchableOpacity>

              {/* Nút 2: Thêm thủ công (Icon Cộng tròn) */}
              <TouchableOpacity onPress={() => setModalManualVisible(true)} style={{ padding: 5 }}>
                <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

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

      <Text style={{ marginLeft: 15, fontWeight: '600', color: '#666', marginBottom: 5 }}>Giỏ hàng ({items.length})</Text>
      
      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id.toString()}
        renderItem={renderCartItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Giỏ hàng trống</Text>}
      />

      {/* --- MODAL 1: CHỌN TỪ KHO (Full Screen) --- */}
      <Modal
        animationType="slide"
        transparent={false} // Full màn hình
        visible={modalListVisible}
        onRequestClose={() => setModalListVisible(false)}
      >
         <View style={{flex: 1, backgroundColor: '#f5f5f5'}}>
             {/* Header của Modal List */}
             <View style={styles.modalListHeader}>
                 <TouchableOpacity onPress={() => setModalListVisible(false)}>
                     <Text style={{color: '#007AFF', fontSize: 16}}>Đóng</Text>
                 </TouchableOpacity>
                 <Text style={{fontSize: 17, fontWeight: 'bold'}}>Kho sản phẩm</Text>
                 <View style={{width: 40}} /> 
             </View>
             
             {/* Component Danh sách sản phẩm */}
             <ProductListScreen 
                 cartId={Number(cartId)} 
                 onItemAdded={() => fetchCartItems()} // Reload cart khi thêm xong
             />
         </View>
      </Modal>

      {/* --- MODAL 2: THÊM THỦ CÔNG (Popup) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalManualVisible} // Đã đổi tên state
        onRequestClose={() => setModalManualVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm thủ công</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Tên sản phẩm (*):</Text>
              <TextInput style={styles.modalInput} value={newName} onChangeText={setNewName} placeholder="VD: Bánh kẹo..." />

              <Text style={styles.label}>Ảnh sản phẩm:</Text>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerBtn}>
                  {newImage ? (
                    <Image source={{ uri: newImage }} style={styles.imagePreview} />
                  ) : (
                    <Text style={{ color: '#666' }}>+ Chọn ảnh từ thư viện</Text>
                  )}
                </TouchableOpacity>
                {newImage ? (
                  <TouchableOpacity onPress={() => setNewImage('')}>
                    <Text style={{ color: 'red', marginTop: 5, fontSize: 12 }}>Xóa ảnh</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Giá (VNĐ):</Text>
                  <TextInput style={styles.modalInput} value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Số lượng:</Text>
                  <TextInput style={styles.modalInput} value={newQuantity} onChangeText={setNewQuantity} keyboardType="numeric" placeholder="1" />
                </View>
              </View>

              <Text style={styles.label}>Loại (Category):</Text>
              <TextInput style={styles.modalInput} value={newCategory} onChangeText={setNewCategory} placeholder="VD: Thực phẩm" />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalManualVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleAddItem}>
                <Text style={[styles.btnText, { color: 'white' }]}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerSection: { backgroundColor: '#fff', padding: 15, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editBtn: { color: '#007AFF', fontSize: 16 },
  infoText: { fontSize: 15, marginBottom: 4, color: '#444' },

  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 8, backgroundColor: '#fff' },
  cancelText: { color: 'red', textAlign: 'right' },

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

  // Styles cho Header của Modal List (Mới)
  modalListHeader: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderColor: '#eee',
      marginTop: Platform.OS === 'ios' ? 40 : 0 // Tránh tai thỏ iPhone
  },

  // Modal Styles (Thủ công)
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: 'white', borderRadius: 15, padding: 20, width: '100%', maxHeight: '80%',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#333', marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#eee', marginRight: 10 },
  btnSave: { backgroundColor: '#34C759' },
  btnText: { fontSize: 16, fontWeight: '600' },

  // Image Picker Styles
  imagePickerBtn: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    marginTop: 5,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
});