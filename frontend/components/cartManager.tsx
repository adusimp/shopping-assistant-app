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
  Modal,
  ScrollView,
  Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFullImageUrl } from '@/common/function/getImageUrl';

// TODO: Thay đổi IP này thành IP máy tính của bạn
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Cart {
  id: number;
  name: string;
  notify_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function CartManager() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  
  // --- XỬ LÝ DATE PICKER (DÙNG CHUNG) ---
  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  // --- HÀM HỖ TRỢ RIÊNG CHO WEB ---

  // Lấy chuỗi ngày hôm nay (YYYY-MM-DD) cho thuộc tính 'min'
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. Chuyển Date sang chuỗi YYYY-MM-DD (để hiển thị vào ô ngày)
  const formatDateForWeb = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // 2. Chuyển Date sang chuỗi HH:mm (để hiển thị vào ô giờ)
  const formatTimeForWeb = (date: Date) => {
    const d = new Date(date);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // 3. Xử lý khi chọn Ngày trên Web
  const handleWebDateChange = (e: any) => {
    const newDateStr = e.target.value;
    if (!newDateStr) return;

    const newDate = new Date(date);
    const [year, month, day] = newDateStr.split('-').map(Number);
    newDate.setFullYear(year, month - 1, day);
    setDate(newDate);
  };

  // 4. Xử lý khi chọn Giờ trên Web
  const handleWebTimeChange = (e: any) => {
    const newTimeStr = e.target.value;
    if (!newTimeStr) return;

    const [hours, minutes] = newTimeStr.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setDate(newDate);
  };


  // 1. Hàm GET: Lấy danh sách cart
  const fetchCarts = async () => {
    try {
      const response = await fetch(`${API_URL}/cart`);
      const data = await response.json();
      const sortedData = data.sort((a: Cart, b: Cart) => b.id - a.id);
      setCarts(sortedData);
    } catch (error) {
      console.error('Lỗi lấy danh sách:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  // 2. Hàm POST: Tạo cart mới
  const handleCreateCart = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên giỏ hàng');
      return;
    }

    try {
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 19);

      const payload = {
        name: name,
        notify_at: localISOTime,
      };

      const response = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Thành công', 'Đã tạo Cart mới!');
        setName('');
        setDate(new Date());
        fetchCarts();
      } else {
        Alert.alert('Thất bại', 'Server trả về lỗi');
      }
    } catch (error) {
      console.error('Lỗi tạo cart:', error);
      Alert.alert('Lỗi', 'Không thể tạo cart');
    }
  };

  // 3. Hàm DELETE: Xóa cart
  const executeDelete = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/cart/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setCarts((prevList) => prevList.filter((item) => item.id !== id));
        if (Platform.OS !== 'web') {
          Alert.alert("Thành công", "Đã xóa đơn hàng.");
        }
      } else {
        Alert.alert("Thất bại", "Không thể xóa đơn hàng lúc này.");
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối server.");
    }
  };

  const handleDelete = (id: number) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa giỏ hàng này không?");
      if (confirmDelete) executeDelete(id);
    } else {
      Alert.alert(
        "Xác nhận xóa",
        "Bạn có chắc chắn muốn xóa giỏ hàng này không?",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", style: "destructive", onPress: () => executeDelete(id) }
        ]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCarts();
  };

  const renderItem = ({ item }: { item: Cart }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        router.push({
          pathname: '/list/[id]',
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardId}>ID: {item.id}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.label}>
          Thông báo: <Text style={styles.value}>{item.notify_at ? formatDateTime(item.notify_at) : 'Không có'}</Text>
        </Text>
        <Text style={styles.subText}>Tạo lúc: {formatDateTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>Tạo Cart Mới</Text>

        <Text style={styles.label}>Tên Cart:</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập tên Cart (VD: Mua đồ tết)"
          value={name}
          onChangeText={setName}
        />

       
        <Text style={styles.label}>Thời gian thông báo:</Text>

        {/* KHU VỰC CHỌN NGÀY GIỜ */}
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 15 }}>
            {/* CỘT CHỌN NGÀY */}
            <View>
              <Text style={styles.webLabel}>Ngày:</Text>
              {/* @ts-ignore */}
              {React.createElement('input', {
                type: 'date',
                value: formatDateForWeb(date),
                onChange: handleWebDateChange,
                min: getTodayString(), // <--- ĐÃ THÊM: KHÔNG CHO CHỌN NGÀY TRONG QUÁ KHỨ
                style: {
                  padding: 10,
                  borderRadius: 5,
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  height: 40,
                  width: 150,
                  fontSize: 14,
                  color: '#333'
                }
              })}
            </View>

            {/* CỘT CHỌN GIỜ */}
            <View>
              <Text style={styles.webLabel}>Giờ:</Text>
              {/* @ts-ignore */}
              {React.createElement('input', {
                type: 'time',
                value: formatTimeForWeb(date),
                onChange: handleWebTimeChange,
                style: {
                  padding: 10,
                  borderRadius: 5,
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  height: 40,
                  width: 120,
                  fontSize: 14,
                  color: '#333'
                }
              })}
            </View>
          </View>
        ) : (
          /* HIỂN THỊ TRÊN MOBILE */
          <>
            <View style={styles.dateTimeDisplay}>
              <Text style={styles.dateTimeText}>
                {date.toLocaleDateString('vi-VN')} - {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.dateBtnContainer}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => showMode('date')}>
                <Text style={styles.dateBtnText}>📅 Chọn Ngày</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateBtn} onPress={() => showMode('time')}>
                <Text style={styles.dateBtnText}>⏰ Chọn Giờ</Text>
              </TouchableOpacity>
            </View>

            {/* Picker ẩn hiện cho Mobile */}
            {showPicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode={mode}
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDate}
                minimumDate={new Date()} // <--- ĐÃ THÊM: KHÔNG CHO CHỌN NGÀY TRONG QUÁ KHỨ
              />
            )}

            {/* Nút Xong cho iOS */}
            {Platform.OS === 'ios' && showPicker && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#f0f0f0', marginTop: 5, marginBottom: 10 }]}
                onPress={() => setShowPicker(false)}>
                <Text style={{ color: '#007AFF' }}>Xong / Đóng</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleCreateCart}>
          <Text style={styles.buttonText}>TẠO MỚI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Danh Sách Cart ({carts.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <FlatList
            data={carts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
     
    </View>
  );
}

const formatDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  webLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  dateTimeDisplay: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  dateBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateBtn: {
    flex: 0.48,
    backgroundColor: 'white',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  dateBtnText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardId: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    marginTop: 5,
  },
  value: {
    fontWeight: '600',
    color: '#333',
  },
  subText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
 
});