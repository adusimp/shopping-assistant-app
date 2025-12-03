import { router } from 'expo-router';
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
  RefreshControl,
  Platform,
  Modal, // Import Modal
  KeyboardAvoidingView, // Để bàn phím không che form
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleCartNotification } from '@/common/notificationHelper';
import { useUser } from '@/context/userContext';
import { Ionicons } from '@expo/vector-icons'; // Import Icon cho nút thêm

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Cart {
  id: number;
  name: string;
  notify_at: string | null;
  created_at: string;
  updated_at: string;
  budget: number;
}

export default function CartManager() {
  const { user, logout } = useUser();

  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- STATE MỚI: QUẢN LÝ MODAL ---
  const [modalVisible, setModalVisible] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');

  // Date Picker States
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  // ... Helpers Date Picker (Giữ nguyên) ...
  const onChangeDate = (event: any, selectedDate?: Date) => { if (Platform.OS === 'android') setShowPicker(false); if (selectedDate) setDate(selectedDate); };
  const showMode = (currentMode: 'date' | 'time') => { setShowPicker(true); setMode(currentMode); };
  const getTodayString = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const formatDateForWeb = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().split('T')[0]; };
  const formatTimeForWeb = (d: Date) => { const hh = d.getHours().toString().padStart(2, '0'); const mm = d.getMinutes().toString().padStart(2, '0'); return `${hh}:${mm}`; };
  const handleWebDateChange = (e: any) => { const str = e.target.value; if(!str) return; const d = new Date(date); const [y, m, day] = str.split('-').map(Number); d.setFullYear(y, m-1, day); setDate(d); };
  const handleWebTimeChange = (e: any) => { const str = e.target.value; if(!str) return; const [h, m] = str.split(':').map(Number); const d = new Date(date); d.setHours(h); d.setMinutes(m); setDate(d); };

  // Fetch Carts
  const fetchCarts = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/cart?userId=${user.user_id}`);
      const data = await response.json();
      if (Array.isArray(data)) {
          const sortedData = data.sort((a: Cart, b: Cart) => b.id - a.id);
          setCarts(sortedData);
      } else {
          setCarts([]);
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchCarts(); }, [user]);

  // Handle Create
  const handleCreateCart = async () => {
    if (!name.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên giỏ hàng'); return; }
    if (!user) { Alert.alert("Lỗi", "Vui lòng đăng nhập lại"); return; }

    try {
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 19);

      const payload = {
        name: name,
        notify_at: localISOTime,
        budget: parseFloat(budget) || 0,
        userId: user.user_id,
      };

      const response = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newCartData = await response.json(); 
        if (newCartData.notify_at) {
            await scheduleCartNotification(newCartData.id, newCartData.name, newCartData.notify_at);
        }

        Alert.alert('Thành công', 'Đã tạo Cart mới!');
        
        // Reset và Đóng Modal
        setName(''); setBudget(''); setDate(new Date());
        setModalVisible(false); // <--- Đóng Modal
        
        fetchCarts();
      } else { Alert.alert('Thất bại', 'Server trả về lỗi'); }
    } catch (error) { console.error('Lỗi tạo cart:', error); }
  };

  // Handle Delete
  const handleDelete = (id: number) => {
    const executeDelete = async () => {
        try {
            const res = await fetch(`${API_URL}/cart/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
            if (res.ok) setCarts(prev => prev.filter(i => i.id !== id));
        } catch(e) { console.error(e); }
    };
    if (Platform.OS === 'web') { if(confirm("Xóa?")) executeDelete(); }
    else { Alert.alert("Xóa", "Chắc chắn xóa?", [{text: "Hủy"}, {text: "Xóa", style: "destructive", onPress: () => executeDelete()}]); }
  };

  const formatDateTime = (iso: string) => iso ? new Date(iso).toLocaleString('vi-VN') : '';
  const formatCurrency = (val: number) => val.toLocaleString('vi-VN', {style: 'currency', currency: 'VND'});

  const renderItem = ({ item }: { item: Cart }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}><Text style={styles.deleteText}>Xóa</Text></TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
            {item.budget > 0 && <Text style={styles.label}>Ngân sách: <Text style={[styles.value, {color: '#007AFF'}]}>{formatCurrency(item.budget)}</Text></Text>}
            <Text style={styles.label}>Thông báo: <Text style={styles.value}>{item.notify_at ? formatDateTime(item.notify_at) : 'Không có'}</Text></Text>
            <Text style={styles.subText}>Tạo lúc: {formatDateTime(item.created_at)}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.userHeader}>
          <Text style={styles.welcomeText}>👋 Xin chào, {user?.email}</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
      </View>

      {/* --- NÚT MỞ MODAL TẠO MỚI --- */}
      <TouchableOpacity style={styles.fabButton} onPress={() => setModalVisible(true)}>
         <Text style={styles.fabText}>+ Tạo giỏ hàng mới</Text>
      </TouchableOpacity>
      {/* --------------------------- */}

      {/* DANH SÁCH CART */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Danh Sách Cart ({carts.length})</Text>
        {loading ? <ActivityIndicator size="large" /> : (
          <FlatList
            data={carts}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchCarts();}} />}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có giỏ hàng</Text>}
            contentContainerStyle={{ paddingBottom: 80 }} // Chừa chỗ cho nút nếu cần
          />
        )}
      </View>

      {/* --- MODAL TẠO CART --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo Cart Mới</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Tên Cart:</Text>
                <TextInput style={styles.modalInput} placeholder="Nhập tên Cart (VD: Mua đồ tết)" value={name} onChangeText={setName} />

                <Text style={styles.label}>Ngân sách dự kiến (VNĐ):</Text>
                <TextInput style={styles.modalInput} placeholder="VD: 500000" value={budget} onChangeText={setBudget} keyboardType="numeric" />

                <Text style={styles.label}>Thời gian thông báo:</Text>
                
                {/* Chọn Ngày Giờ */}
                {Platform.OS === 'web' ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    {/* ... (Code Input Date Web cũ giữ nguyên) ... */}
                    {React.createElement('input', { type: 'date', value: formatDateForWeb(date), onChange: handleWebDateChange, style: { padding: 10, flex:1, border:'1px solid #ccc', borderRadius:5 } })}
                    {React.createElement('input', { type: 'time', value: formatTimeForWeb(date), onChange: handleWebTimeChange, style: { padding: 10, flex:1, border:'1px solid #ccc', borderRadius:5 } })}
                  </View>
                ) : (
                  <>
                    <View style={styles.dateTimeDisplay}>
                      <Text style={styles.dateTimeText}>{date.toLocaleDateString('vi-VN')} - {date.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</Text>
                    </View>
                    <View style={styles.dateBtnContainer}>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => showMode('date')}><Text style={styles.dateBtnText}>📅 Chọn Ngày</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => showMode('time')}><Text style={styles.dateBtnText}>⏰ Chọn Giờ</Text></TouchableOpacity>
                    </View>
                    {showPicker && <DateTimePicker value={date} mode={mode} is24Hour={true} display="spinner" onChange={onChangeDate} minimumDate={new Date()} />}
                    {Platform.OS === 'ios' && showPicker && <TouchableOpacity style={styles.iosCloseBtn} onPress={() => setShowPicker(false)}><Text style={{color:'#007AFF'}}>Xong</Text></TouchableOpacity>}
                  </>
                )}
            </ScrollView>

            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.btnTextBlack}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleCreateCart}>
                    <Text style={styles.btnTextWhite}>TẠO MỚI</Text>
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  welcomeText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  logoutBtn: { padding: 8, backgroundColor: '#ffebee', borderRadius: 6 },
  logoutText: { color: 'red', fontWeight: '600', fontSize: 12 },
  
  // Nút Mở Modal (FAB Style)
  fabButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3
  },
  fabText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  listContainer: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  
  // Card Item
  card: { backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardId: { fontSize: 12, color: '#888' },
  headerInfo: { flex: 1, marginRight: 10 },
  deleteButton: { padding: 5, backgroundColor: '#fff0f0', borderRadius: 4 },
  deleteText: { color: 'red', fontWeight: 'bold', fontSize: 12 },
  cardBody: { marginTop: 5 },
  label: { color: '#555', fontSize: 14, marginTop: 2 },
  value: { fontWeight: '600', color: '#333' },
  subText: { fontSize: 12, color: '#999', marginTop: 5, textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, maxHeight: '90%', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
  
  // Date Picker UI inside Modal
  dateTimeDisplay: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  dateTimeText: { color: '#007AFF', fontWeight: 'bold' },
  dateBtnContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dateBtn: { flex: 0.48, padding: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  dateBtnText: { color: '#007AFF', fontWeight: '600' },
  iosCloseBtn: { alignItems: 'flex-end', padding: 10, backgroundColor: '#f0f0f0' },

  // Buttons in Modal
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 0.48, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f0f0f0' },
  btnSave: { backgroundColor: '#007AFF' },
  btnTextWhite: { color: 'white', fontWeight: 'bold' },
  btnTextBlack: { color: '#333', fontWeight: 'bold' },
});