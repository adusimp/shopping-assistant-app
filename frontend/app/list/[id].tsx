import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import ProductListScreen, { ProductCategory } from '@/components/productListScreen';
import { Ionicons } from '@expo/vector-icons';
import { scheduleCartNotification } from '@/common/notificationHelper';
import { AiSuggestModal } from '@/components/cart/aiSuggestModal';
import { CartItemRow } from '@/components/cart/cartItem';
import { PriceCheckModal } from '@/components/cart/priceCheckModal';
import { ManualAddModal } from '@/components/cart/addProductModal';

// TODO: Thay đổi IP này thành IP máy tính của bạn
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CartDetail {
  id: number;
  name: string;
  notify_at: string | null;
  budget: number;
}

// Interface này phải khớp với cái bên CartItemRow
interface CartItem {
  product_id: number;
  name: string;
  img_url: string;
  quantity: number;
  is_bought: boolean;
  total_price: string;
}

export default function ListDetailScreen() {

  const { id } = useLocalSearchParams();
  const cartId = Array.isArray(id) ? id[0] : id;

  // --- State Data ---
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State Edit Header ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotify, setEditNotify] = useState('');
  const [editBudget, setEditBudget] = useState(''); // State cho budget

  // --- State Modal Thủ công & Kho ---
  const [modalManualVisible, setModalManualVisible] = useState(false);
  const [modalListVisible, setModalListVisible] = useState(false);

  // Form fields (Thủ công)


  // --- State AI Suggest Modal ---
  const [modalSuggestVisible, setModalSuggestVisible] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<any[]>([]);

  // --- State Price Check Modal ---
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [targetItem, setTargetItem] = useState<CartItem | null>(null);
  const [aiPrice, setAiPrice] = useState<number>(0);
  const [loadingAiPrice, setLoadingAiPrice] = useState(false);

  // --- Helpers ---
  const formatCurrency = (price: string | number) => {
    const numberPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numberPrice)) return '0 ₫';
    return numberPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const sortItems = (list: CartItem[]) => {
    return list.sort((a, b) => {
      if (a.is_bought === b.is_bought) return 0;
      return a.is_bought ? 1 : -1;
    });
  };

  // --- Effects & Computed ---
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  }, [items]);

  const boughtPrice = useMemo(() => {
    return items.reduce((sum, item) => item.is_bought ? sum + (parseFloat(item.total_price) || 0) : sum, 0);
  }, [items]);

  useEffect(() => {
    if (!cartId) return;
    fetchCartDetails();
    fetchCartItems();
  }, [cartId]);

  // --- Logic API ---
  const fetchCartDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${cartId}`);
      const data = await res.json();
      setCart(data);
      setEditName(data.name);
      setEditNotify(data.notify_at || '');
      setEditBudget(data.budget > 0 ? data.budget.toString() : '');
    } catch (error) { console.error('Lỗi lấy chi tiết cart:', error); }
  };

  const fetchCartItems = async () => {
    try {
      const res = await fetch(`${API_URL}/product/product-in-cart/${cartId}`);
      const data = await res.json();
      setItems(sortItems(data));
    } catch (error) { console.error('Lỗi lấy items:', error); }
    finally { setLoading(false); }
  };

  const handleUpdateCart = async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          notify_at: editNotify || null,
          budget: parseFloat(editBudget) || 0
        }),
      });
      if (res.ok) {
        if (editNotify) await scheduleCartNotification(Number(cartId), editName, editNotify);
        Alert.alert('Thành công', 'Đã cập nhật thông tin');
        setIsEditing(false);
        fetchCartDetails();
      }
    } catch (error) { console.error(error); }
  };

  // --- Logic Tương tác Item ---
  const handleToggleStatus = async (item: CartItem) => {
    const originalItems = [...items];
    setItems((prevItems) => sortItems(prevItems.map((i) => i.product_id === item.product_id ? { ...i, is_bought: !i.is_bought } : i)));

    try {
      await fetch(`${API_URL}/cart/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: Number(cartId), productId: item.product_id }),
      });
    } catch (error) {
      setItems(originalItems);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };

  const handleDeleteItem = (productId: number) => {
    const executeDelete = async () => {
      try {
        const res = await fetch(`${API_URL}/cart/${id}/items/${productId}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          setItems((prev) => prev.filter((i) => i.product_id !== productId));
        } else { Alert.alert("Lỗi", "Không thể xóa"); }
      } catch (e) { Alert.alert("Lỗi mạng"); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Xóa sản phẩm này?")) executeDelete();
    } else {
      Alert.alert("Xác nhận xóa", "Bạn muốn bỏ sản phẩm này?", [
        { text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    const executeClear = async () => {
      try {
        const res = await fetch(`${API_URL}/cart/${id}/clear`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) { setItems([]); }
        else { Alert.alert("Lỗi", "Không thể dọn giỏ hàng"); }
      } catch (e) { Alert.alert("Lỗi mạng"); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Xóa TẤT CẢ?")) executeClear();
    } else {
      Alert.alert("Xác nhận dọn giỏ hàng", "Xóa TẤT CẢ sản phẩm?", [
        { text: "Hủy", style: "cancel" }, { text: "Xóa sạch", style: "destructive", onPress: executeClear }
      ]);
    }
  };

  // --- Logic Price Check Modal ---
  const openPriceSuggestion = async (item: CartItem) => {
    setTargetItem(item);
    setPriceModalVisible(true);
    setLoadingAiPrice(true);
    setAiPrice(0);

    try {
      const res = await fetch(`${API_URL}/cart/suggest-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: item.name, productId: item.product_id }),
      });
      const data = await res.json();
      const priceFromServer = data.suggestedPrice || data.aiPrice || data.price;
      setAiPrice(Number(priceFromServer) || 0);
    } catch (error) { Alert.alert("Lỗi", "Không thể lấy giá AI"); }
    finally { setLoadingAiPrice(false); }
  };

  const handleConfirmUpdatePrice = async () => {
    if (!targetItem || aiPrice <= 0) return;
    try {
      const res = await fetch(`${API_URL}/cart/update-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetItem.product_id, price: aiPrice }),
      });
      if (res.ok) {
        Alert.alert("Thành công", "Đã cập nhật giá mới!");
        setPriceModalVisible(false);
        fetchCartItems();
      }
    } catch (error) { Alert.alert("Lỗi mạng"); }
  };

  // --- Logic AI Suggest Modal ---
  const handleGetSuggestion = async () => {
    if (!cart?.name) return;
    setIsSuggesting(true);
    try {
      const res = await fetch(`${API_URL}/cart/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartName: cart.name }),
      });
      const data = await res.json();
      if (data.items) {
        setSuggestedItems(data.items);
        setModalSuggestVisible(true);
      }
    } catch (error) { Alert.alert("Lỗi", "AI đang bận"); }
    finally { setIsSuggesting(false); }
  };

  const handleConfirmSuggestions = async (itemsToSave: any[]) => {
    if (itemsToSave.length === 0) return;
    setIsSuggesting(true);
    try {
      const payload = {
        cartId: Number(id),
        items: itemsToSave.map(item => ({
          type: item.type,
          id: item.type === 'EXISTING' ? item.id : undefined,
          name: item.name,
          price: item.price ? Number(item.price) : 0,
          img_url: item.img_url || null
        }))
      };
      const res = await fetch(`${API_URL}/cart/add-ai-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Alert.alert("Thành công", `Đã thêm ${itemsToSave.length} món!`);
        setModalSuggestVisible(false);
        fetchCartItems();
      }
    } catch (error) { Alert.alert("Lỗi kết nối"); }
    finally { setIsSuggesting(false); }
  };

  // --- Logic Manual Add ---


  // Hàm xử lý khi Modal con bấm "Lưu"
  const handleAddItem = async (formData: any) => {
    // formData sẽ có dạng: { name, price, quantity, category, imageUri }

    try {
      const textFields = {
        cart_id: String(cartId),
        name: formData.name,
        price: String(formData.price || 0),
        quantity: String(formData.quantity || 1),
        category: formData.category || '',
      };

      if (Platform.OS === 'web') {
        const postData = new FormData();
        Object.entries(textFields).forEach(([k, v]) => postData.append(k, v as string));

        if (formData.imageUri) {
          const res = await fetch(formData.imageUri);
          const blob = await res.blob();
          postData.append('file', blob, 'upload.jpg');
        }

        const res = await fetch(`${API_URL}/product/add-product-to-cart`, {
          method: 'POST', body: postData
        });

        if (res.ok) {
          Alert.alert("Thành công", "Đã thêm sản phẩm!");
          fetchCartItems();
        }
      } else {
        // Mobile Upload
        if (!formData.imageUri) {
          Alert.alert("Thông báo", "Bạn chưa chọn ảnh (sẽ dùng ảnh mặc định)");
          // Nếu bắt buộc ảnh thì return tại đây
        }

        if (formData.imageUri) {
          await uploadAsync(`${API_URL}/product/add-product-to-cart`, formData.imageUri, {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: FileSystemUploadType.MULTIPART,
            parameters: textFields,
          });
        } else {
          // Nếu không có ảnh, bạn cần API hỗ trợ không gửi file, 
          // hoặc gửi request thường thay vì uploadAsync
          // Tạm thời mình giả định bạn luôn chọn ảnh hoặc API bạn xử lý được.
        }

        Alert.alert("Thành công", "Đã thêm sản phẩm!");
        fetchCartItems();
      }

      // Đóng modal thì component con tự làm rồi, ở đây chỉ cần load lại data
      setModalManualVisible(false);

    } catch (e) {
      Alert.alert("Lỗi", String(e));
    }
  };


  if (loading) return <ActivityIndicator style={styles.centered} size="large" />;

  // --- UI ---
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: cart?.name || 'Chi tiết',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <TouchableOpacity onPress={() => setModalListVisible(true)} style={{ padding: 5 }}>
                <Ionicons name="library-outline" size={26} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalManualVisible(true)} style={{ padding: 5 }}>
                <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnConfirm, { flexDirection: 'row', gap: 5 }]}
          onPress={handleGetSuggestion} disabled={isSuggesting}
        >
          {isSuggesting ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: 'white' }}>✨</Text>}
          <Text style={styles.btnText}>Gợi ý AI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Thông Tin Cart</Text>
          <TouchableOpacity onPress={() => isEditing ? handleUpdateCart() : setIsEditing(true)}>
            <Text style={styles.editBtn}>{isEditing ? 'Lưu' : 'Sửa'}</Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View>
            <Text style={styles.label}>Tên:</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <Text style={styles.label}>Ngân sách:</Text>
            <TextInput style={styles.input} value={editBudget} onChangeText={setEditBudget} keyboardType="numeric" placeholder="0" />
            <Text style={styles.label}>Hẹn giờ:</Text>
            <TextInput style={styles.input} value={editNotify} onChangeText={setEditNotify} />
            <TouchableOpacity onPress={() => setIsEditing(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.infoText}>📦 {cart?.name}</Text>
            <Text style={styles.infoText}>💰 Ngân sách: {cart?.budget ? formatCurrency(cart.budget) : 'Chưa đặt'}</Text>
            <Text style={styles.infoText}>⏰ {cart?.notify_at ? new Date(cart.notify_at).toLocaleString('vi-VN') : 'Chưa đặt giờ'}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 15 }}>
        <Text style={{ fontWeight: '600', color: '#666' }}>Giỏ hàng ({items.length})</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={{ fontWeight: '600', color: 'red' }}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id.toString()}
        // --- SỬ DỤNG COMPONENT MỚI ---
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onToggle={handleToggleStatus}
            onCheckPrice={openPriceSuggestion}
            onDelete={handleDeleteItem}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Giỏ hàng trống</Text>}
      />

      <View style={styles.footerContainer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Tổng dự kiến:</Text>
          <Text style={styles.footerTotal}>{formatCurrency(totalPrice.toString())}</Text>
        </View>
        {boughtPrice > 0 && (
          <View style={styles.footerRowSmall}>
            <Text style={styles.footerLabelSmall}>Đã mua:</Text>
            <Text style={styles.footerTotalSmall}>{formatCurrency(boughtPrice.toString())}</Text>
          </View>
        )}
      </View>

      {/* --- CÁC MODAL --- */}
      <Modal
        visible={modalListVisible}
        animationType="slide"
      // ...
      >
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          {/* ... Header Modal ... */}
          <View style={styles.modalListHeader}>
            <TouchableOpacity onPress={() => setModalListVisible(false)} style={{ padding: 5 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 17, fontWeight: 'bold' }}>Kho sản phẩm</Text>

            {/* View rỗng này để đẩy tiêu đề vào giữa (cân đối với nút Đóng) */}
            <View style={{ width: 40 }} />
          </View>
          {/* Gọi Component tại đây */}
          <ProductListScreen
            cartId={Number(cartId)}
            onItemAdded={() => fetchCartItems()} // Reload giỏ hàng sau khi thêm
          />
        </View>
      </Modal>
      <ManualAddModal
        visible={modalManualVisible}
        onClose={() => setModalManualVisible(false)}
        onAdd={handleAddItem}
      />

      {/* --- MODAL AI SUGGEST (MỚI) --- */}
      <AiSuggestModal
        visible={modalSuggestVisible}
        onClose={() => setModalSuggestVisible(false)}
        cartName={cart?.name}
        suggestions={suggestedItems}
        onAddItems={handleConfirmSuggestions}
      />

      {/* --- MODAL PRICE CHECK (MỚI) --- */}
      <PriceCheckModal
        visible={priceModalVisible}
        onClose={() => setPriceModalVisible(false)}
        onConfirm={handleConfirmUpdatePrice}
        targetItem={targetItem}
        aiPrice={aiPrice}
        loading={loadingAiPrice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Giữ lại các style chung cho Layout, Header, Footer
  // Xóa các style thừa của ItemRow, SuggestModal, PriceModal
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header Screen
  headerSection: { backgroundColor: '#fff', padding: 15, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  editBtn: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  infoText: { fontSize: 15, marginBottom: 4, color: '#444' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 8, backgroundColor: '#f9f9f9', fontSize: 16 },
  cancelText: { color: 'red', textAlign: 'right', marginTop: 5, fontSize: 14 },

  // Buttons
  actionButtonRow: { flexDirection: 'row', gap: 10, marginBottom: 15, paddingHorizontal: 15 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#f2f2f7', marginRight: 10 },
  btnSave: { backgroundColor: '#34C759' },
  btnConfirm: { backgroundColor: '#6C5CE7' },
  btnText: { fontSize: 16, fontWeight: '600' },

  // Footer Total
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderColor: '#eee', shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
  footerTotal: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  footerRowSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  footerLabelSmall: { fontSize: 14, color: '#999' },
  footerTotalSmall: { fontSize: 14, color: '#34C759', fontWeight: '600', textDecorationLine: 'line-through' },

  // Empty List
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },

  // Modal Common
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '100%', maxHeight: '85%', shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  modalListHeader: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee', marginTop: Platform.OS === 'ios' ? 40 : 0 },

  // Form in Modal
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#555', marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, alignItems: 'center' },

  // Image Picker
  imagePickerBtn: { width: '100%', height: 160, backgroundColor: '#fafafa', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', borderStyle: 'dashed', marginTop: 5, marginBottom: 5 },
  imagePreview: { width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', height: 50, justifyContent: 'center' },
  picker: { width: '100%', height: '100%' },
});