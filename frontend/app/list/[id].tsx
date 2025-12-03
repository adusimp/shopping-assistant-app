import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { scheduleCartNotification } from '@/common/notificationHelper';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import thêm cái này
import { ManualAddModal } from '@/components/cart/addProductModal';
import { AiSuggestModal } from '@/components/cart/aiSuggestModal';
import { CartItemRow } from '@/components/cart/cartItem';
import { PriceCheckModal } from '@/components/cart/priceCheckModal';
import ProductListScreen from '@/components/productListScreen';

// --- IMPORT CÁC COMPONENT ĐÃ TÁCH ---


const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CartDetail {
  id: number;
  name: string;
  notify_at: string | null;
  budget: number;
}

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
  const [editBudget, setEditBudget] = useState('');
  
  // --- STATE MỚI CHO DATE PICKER (EDIT) ---
  const [editDate, setEditDate] = useState(new Date());
  const [showEditPicker, setShowEditPicker] = useState(false);
  const [editPickerMode, setEditPickerMode] = useState<'date' | 'time'>('date');

  // --- State Modal ---
  const [modalManualVisible, setModalManualVisible] = useState(false);
  const [modalListVisible, setModalListVisible] = useState(false);
  const [modalSuggestVisible, setModalSuggestVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);

  // --- State AI Logic ---
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<any[]>([]);
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
// --- HELPERS CHO WEB DATE PICKER (EDIT) ---
  const formatDateForWeb = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const formatTimeForWeb = (date: Date) => {
    const d = new Date(date);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleWebEditDateChange = (e: any) => {
    const str = e.target.value;
    if (!str) return;
    const d = new Date(editDate);
    const [y, m, day] = str.split('-').map(Number);
    d.setFullYear(y, m - 1, day);
    setEditDate(d);
  };

  const handleWebEditTimeChange = (e: any) => {
    const str = e.target.value;
    if (!str) return;
    const [h, m] = str.split(':').map(Number);
    const d = new Date(editDate);
    d.setHours(h);
    d.setMinutes(m);
    setEditDate(d);
  };

  // --- Xử lý Date Picker ---
  const onChangeEditDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditPicker(false);
    if (selectedDate) setEditDate(selectedDate);
  };

  const showEditMode = (currentMode: 'date' | 'time') => {
    setShowEditPicker(true);
    setEditPickerMode(currentMode);
  };

  // --- Effects & Computed ---
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  }, [items]);

  const boughtPrice = useMemo(() => {
    return items.reduce((sum, item) => item.is_bought ? sum + (parseFloat(item.total_price) || 0) : sum, 0);
  }, [items]);

  const budget = cart?.budget || 0;
  const percent = budget > 0 ? (totalPrice / budget) * 100 : 0;
  const remaining = budget - totalPrice;
  const isOverBudget = remaining < 0;
  let progressColor = '#34C759'; 
  if (percent > 100) progressColor = '#FF3B30';
  else if (percent > 80) progressColor = '#FFCC00';

  useEffect(() => {
    if (!cartId) return;
    fetchCartDetails();
    fetchCartItems();
  }, [cartId]);

  // --- 1. API Calls ---
  const fetchCartDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/cart/${cartId}`);
      const data = await res.json();
      setCart(data);
      setEditName(data.name);
      setEditBudget(data.budget > 0 ? data.budget.toString() : '');
      
      // Set ngày hiện tại nếu có, hoặc ngày mai nếu chưa có
      if (data.notify_at) {
          setEditDate(new Date(data.notify_at));
      } else {
          setEditDate(new Date());
      }
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
      // Xử lý múi giờ khi lưu
      const offset = editDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(editDate.getTime() - offset)).toISOString().slice(0, 19);

      const res = await fetch(`${API_URL}/cart/${cartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          notify_at: localISOTime, // Gửi chuỗi ISO chuẩn
          budget: parseFloat(editBudget) || 0
        }),
      });
      if (res.ok) {
        // Hẹn giờ lại
        await scheduleCartNotification(Number(cartId), editName, localISOTime);
        Alert.alert('Thành công', 'Đã cập nhật thông tin');
        setIsEditing(false);
        fetchCartDetails();
      }
    } catch (error) { console.error(error); }
  };

  // ... (Giữ nguyên logic handleToggleStatus, handleDeleteItem, handleClearCart...)
  const handleToggleStatus = async (item: CartItem) => {
    const originalItems = [...items];
    setItems((prevItems) => sortItems(prevItems.map((i) => i.product_id === item.product_id ? { ...i, is_bought: !i.is_bought } : i)));
    try {
      await fetch(`${API_URL}/cart/toggle-status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartId: Number(cartId), productId: item.product_id }) });
    } catch (error) { setItems(originalItems); Alert.alert("Lỗi", "Không thể cập nhật trạng thái"); }
  };

  const handleDeleteItem = (productId: number) => {
    const executeDelete = async () => {
      try {
        const res = await fetch(`${API_URL}/cart/${cartId}/items/${productId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) setItems((prev) => prev.filter((i) => i.product_id !== productId));
        else Alert.alert("Lỗi", "Không thể xóa");
      } catch (e) { Alert.alert("Lỗi mạng"); }
    };
    if (Platform.OS === 'web') { if (window.confirm("Xóa sản phẩm này?")) executeDelete(); } 
    else { Alert.alert("Xác nhận xóa", "Bạn muốn bỏ sản phẩm này?", [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: executeDelete }]); }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    const executeClear = async () => {
      try {
        const res = await fetch(`${API_URL}/cart/${cartId}/clear`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) setItems([]);
        else Alert.alert("Lỗi", "Không thể dọn giỏ hàng");
      } catch (e) { Alert.alert("Lỗi mạng"); }
    };
    if (Platform.OS === 'web') { if (window.confirm("Xóa TẤT CẢ?")) executeClear(); } 
    else { Alert.alert("Xác nhận dọn giỏ hàng", "Xóa TẤT CẢ sản phẩm?", [{ text: "Hủy", style: "cancel" }, { text: "Xóa sạch", style: "destructive", onPress: executeClear }]); }
  };

  // ... (Giữ nguyên logic AI & Modal) ...
  const openPriceSuggestion = async (item: CartItem) => {
    setTargetItem(item); setPriceModalVisible(true); setLoadingAiPrice(true); setAiPrice(0);
    try {
      const res = await fetch(`${API_URL}/cart/suggest-price`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: item.name, productId: item.product_id }) });
      const data = await res.json();
      const priceFromServer = data.suggestedPrice || data.aiPrice || data.price;
      setAiPrice(Number(priceFromServer) || 0);
    } catch (error) { Alert.alert("Lỗi", "Không thể lấy giá AI"); } finally { setLoadingAiPrice(false); }
  };

  const handleConfirmUpdatePrice = async () => {
    if (!targetItem || aiPrice <= 0) return;
    try {
      const res = await fetch(`${API_URL}/cart/update-price`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: targetItem.product_id, price: aiPrice }) });
      if (res.ok) { Alert.alert("Thành công", "Đã cập nhật giá mới!"); setPriceModalVisible(false); fetchCartItems(); }
    } catch (error) { Alert.alert("Lỗi mạng"); }
  };

  const handleGetSuggestion = async () => {
    if (!cart?.name) return;
    setIsSuggesting(true);
    try {
      const res = await fetch(`${API_URL}/cart/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cartName: cart.name }) });
      const data = await res.json();
      if (data.items) { setSuggestedItems(data.items); setModalSuggestVisible(true); }
    } catch (error) { Alert.alert("Lỗi", "AI đang bận"); } finally { setIsSuggesting(false); }
  };

  const handleConfirmSuggestions = async (itemsToSave: any[]) => {
    if (itemsToSave.length === 0) return;
    setIsSuggesting(true);
    try {
      const payload = {
        cartId: Number(cartId),
        items: itemsToSave.map(item => ({
          type: item.type, id: item.type === 'EXISTING' ? item.id : undefined,
          name: item.name, price: item.price ? Number(item.price) : 0, img_url: item.img_url || null
        }))
      };
      const res = await fetch(`${API_URL}/cart/add-ai-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { Alert.alert("Thành công", `Đã thêm ${itemsToSave.length} món!`); setModalSuggestVisible(false); fetchCartItems(); }
    } catch (error) { Alert.alert("Lỗi kết nối"); } finally { setIsSuggesting(false); }
  };

  const handleAddItem = async (formData: any) => {
    try {
      const textFields = { cart_id: String(cartId), name: formData.name, price: String(formData.price || 0), quantity: String(formData.quantity || 1), category: formData.category || '' };
      if (Platform.OS === 'web') {
        const postData = new FormData();
        Object.entries(textFields).forEach(([k, v]) => postData.append(k, v as string));
        if (formData.imageUri) { const res = await fetch(formData.imageUri); const blob = await res.blob(); postData.append('file', blob, 'upload.jpg'); }
        await fetch(`${API_URL}/product/add-product-to-cart`, { method: 'POST', body: postData });
      } else {
        if (formData.imageUri) { await uploadAsync(`${API_URL}/product/add-product-to-cart`, formData.imageUri, { fieldName: 'file', httpMethod: 'POST', uploadType: FileSystemUploadType.MULTIPART, parameters: textFields }); }
      }
      Alert.alert("Thành công", "Đã thêm sản phẩm"); setModalManualVisible(false); fetchCartItems();
    } catch (e) { Alert.alert("Lỗi", String(e)); }
  };

  if (loading) return <ActivityIndicator style={styles.centered} size="large" />;

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
        <TouchableOpacity style={[styles.btn, styles.btnConfirm, { flexDirection: 'row', gap: 5 }]} onPress={handleGetSuggestion} disabled={isSuggesting}>
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
            <Text style={styles.label}>Tên danh sách:</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <Text style={styles.label}>Ngân sách (VNĐ):</Text>
            <TextInput style={styles.input} value={editBudget} onChangeText={setEditBudget} keyboardType="numeric" placeholder="0" />
            
            <Text style={styles.label}>Thời gian thông báo:</Text>
            
            {/* --- LOGIC CHỌN NGÀY GIỜ (WEB / MOBILE) --- */}
            {Platform.OS === 'web' ? (
                /* GIAO DIỆN WEB */
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    {/* @ts-ignore */}
                    {React.createElement('input', {
                        type: 'date',
                        value: formatDateForWeb(editDate),
                        onChange: handleWebEditDateChange,
                        style: { padding: 10, flex: 1, border: '1px solid #ccc', borderRadius: 5 }
                    })}
                    {/* @ts-ignore */}
                    {React.createElement('input', {
                        type: 'time',
                        value: formatTimeForWeb(editDate),
                        onChange: handleWebEditTimeChange,
                        style: { padding: 10, flex: 1, border: '1px solid #ccc', borderRadius: 5 }
                    })}
                </View>
            ) : (
                /* GIAO DIỆN MOBILE */
                <>
                    {/* Hiển thị kết quả */}
                    <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: '#007AFF' }}>
                            {editDate.toLocaleDateString('vi-VN')} - {editDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    {/* Nút bấm */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', marginRight: 5 }]}
                            onPress={() => showEditMode('date')}
                        >
                            <Text style={{ color: '#333' }}>📅 Đổi Ngày</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', marginLeft: 5 }]}
                            onPress={() => showEditMode('time')}
                        >
                            <Text style={{ color: '#333' }}>⏰ Đổi Giờ</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Picker ẩn (Hiện ra khi bấm nút) */}
                    {showEditPicker && (
                        <DateTimePicker
                            value={editDate}
                            mode={editPickerMode}
                            is24Hour={true}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onChangeEditDate}
                        />
                    )}
                    
                    {/* Nút Xong cho iOS */}
                    {Platform.OS === 'ios' && showEditPicker && (
                        <TouchableOpacity 
                            style={{alignItems:'flex-end', marginBottom: 10}}
                            onPress={() => setShowEditPicker(false)}
                        >
                            <Text style={{color: '#007AFF', fontWeight:'bold'}}>Xong</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
            {/* ----------------------------------------- */}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <TouchableOpacity onPress={() => setIsEditing(false)}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleUpdateCart}><Text style={[styles.editBtn, { color: '#34C759' }]}>Lưu lại</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.infoText}>📦 {cart?.name}</Text>
                <Text style={styles.infoText}>⏰ {cart?.notify_at ? new Date(cart.notify_at).toLocaleDateString('vi-VN') : '---'}</Text>
            </View>

            {/* THANH NGÂN SÁCH */}
            {budget > 0 ? (
                <View style={styles.budgetContainer}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                        <Text style={{color: '#666', fontSize: 13}}>
                            Đã dùng: <Text style={{fontWeight: 'bold', color: '#333'}}>{formatCurrency(totalPrice)}</Text>
                        </Text>
                        <Text style={{color: '#666', fontSize: 13}}>
                            Ngân sách: {formatCurrency(budget)}
                        </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: progressColor }]} />
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                        <Text style={{fontSize: 12, fontWeight: '600', color: progressColor}}>{Math.round(percent)}%</Text>
                        <Text style={{fontSize: 12, fontWeight: '600', color: isOverBudget ? '#FF3B30' : '#34C759'}}>
                            {isOverBudget ? `Vượt quá: ${formatCurrency(Math.abs(remaining))}` : `Còn dư: ${formatCurrency(remaining)}`}
                        </Text>
                    </View>
                </View>
            ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={{marginTop: 5}}>
                    <Text style={{color: '#007AFF', fontSize: 13, fontStyle: 'italic'}}>+ Thiết lập ngân sách ngay</Text>
                </TouchableOpacity>
            )}
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

      <Modal visible={modalListVisible} animationType="slide" onRequestClose={() => setModalListVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <View style={styles.modalListHeader}>
            <TouchableOpacity onPress={() => setModalListVisible(false)} style={{ padding: 5 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: 'bold' }}>Kho sản phẩm</Text>
            <View style={{ width: 40 }} />
          </View>
          <ProductListScreen cartId={Number(cartId)} onItemAdded={() => fetchCartItems()} />
        </View>
      </Modal>

      <ManualAddModal visible={modalManualVisible} onClose={() => setModalManualVisible(false)} onAdd={handleAddItem} />
      <AiSuggestModal visible={modalSuggestVisible} onClose={() => setModalSuggestVisible(false)} cartName={cart?.name} suggestions={suggestedItems} onAddItems={handleConfirmSuggestions} />
      <PriceCheckModal visible={priceModalVisible} onClose={() => setPriceModalVisible(false)} onConfirm={handleConfirmUpdatePrice} targetItem={targetItem} aiPrice={aiPrice} loading={loadingAiPrice} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { backgroundColor: '#fff', padding: 15, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  editBtn: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  infoText: { fontSize: 15, marginBottom: 4, color: '#444' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 8, backgroundColor: '#f9f9f9', fontSize: 16 },
  cancelText: { color: 'red', textAlign: 'right', marginTop: 5, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#555', marginTop: 10 },
  budgetContainer: { marginTop: 12, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  progressBarBackground: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  actionButtonRow: { flexDirection: 'row', gap: 10, marginBottom: 15, paddingHorizontal: 15 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnConfirm: { backgroundColor: '#6C5CE7' },
  btnText: { fontSize: 16, fontWeight: '600' },
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderColor: '#eee', shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 16, color: '#666', fontWeight: '500' },
  footerTotal: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  footerRowSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  footerLabelSmall: { fontSize: 14, color: '#999' },
  footerTotalSmall: { fontSize: 14, color: '#34C759', fontWeight: '600', textDecorationLine: 'line-through' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontSize: 16 },
  modalListHeader: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee', marginTop: Platform.OS === 'ios' ? 40 : 0 },
});