import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
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
import ProductListScreen, { ProductCategory } from '@/components/productListScreen';
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
  const CATEGORY_LABELS: Record<string, string> = {
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
  const [newCategory, setNewCategory] = useState(ProductCategory.OTHER);
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
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          {/* Header của Modal List */}
          <View style={styles.modalListHeader}>
            <TouchableOpacity onPress={() => setModalListVisible(false)}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: 'bold' }}>Kho sản phẩm</Text>
            <View style={{ width: 40 }} />
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
        visible={modalManualVisible}
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

              {/* ... (Phần chọn ảnh giữ nguyên) ... */}

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

              {/* --- PHẦN SỬA ĐỔI: CATEGORY PICKER --- */}
              <Text style={styles.label}>Loại (Category):</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newCategory}
                  onValueChange={(itemValue) => setNewCategory(itemValue)}
                  style={styles.picker}
                  mode="dropdown" // Chỉ tác dụng trên Android
                >
                  {/* Render danh sách category từ object */}
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <Picker.Item key={key} label={label} value={key} />
                  ))}
                </Picker>
              </View>
              {/* ------------------------------------- */}

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
  // --- LAYOUT CHUNG ---
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // --- HEADER CỦA SCREEN ---
  headerSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    // Thêm bóng đổ nhẹ cho header
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 18, // Tăng nhẹ cho rõ tiêu đề
    fontWeight: 'bold',
    color: '#333'
  },
  editBtn: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  infoText: {
    fontSize: 15,
    marginBottom: 4,
    color: '#444'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16
  },
  cancelText: {
    color: 'red',
    textAlign: 'right',
    marginTop: 5,
    fontSize: 14
  },

  // --- ITEM TRONG DANH SÁCH ---
  itemRow: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12, // Bo tròn nhiều hơn chút cho hiện đại
    flexDirection: 'row',
    alignItems: 'center',
    // Bóng đổ mềm mại
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  itemImage: {
    width: 60, // Tăng kích thước ảnh chút
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16
  },

  // --- HEADER MODAL DANH SÁCH SẢN PHẨM ---
  modalListHeader: {
    height: 60, // Tăng chiều cao để dễ bấm
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
    // Xử lý tai thỏ (SafeArea) tốt hơn nếu dùng View thường
    paddingTop: Platform.OS === 'ios' ? 0 : 0
  },

  // --- MODAL THÊM THỦ CÔNG ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
    marginTop: 10
  },

  // Style cho TextInput
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12, // Padding rộng hơn cho dễ nhập
    fontSize: 16,
    backgroundColor: '#fafafa'
  },

  // Style MỚI cho Picker (Dropdown Category)
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    height: 50, // Chiều cao cố định bằng TextInput
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },

  // Style cho nút bấm trong Modal
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  btnCancel: {
    backgroundColor: '#f2f2f7',
    marginRight: 10
  },
  btnSave: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600'
  },

  // --- IMAGE PICKER ---
  imagePickerBtn: {
    width: '100%',
    height: 160,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderStyle: 'dashed', // Viền nét đứt
    marginTop: 5,
    marginBottom: 5
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
});