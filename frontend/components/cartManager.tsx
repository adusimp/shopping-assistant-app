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
  Platform
} from 'react-native';


// TODO: Thay đổi IP này thành IP máy tính của bạn
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Định nghĩa kiểu dữ liệu cho Cart (dựa trên output bạn cung cấp)
interface Cart {
  id: number;
  name: string;
  notify_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function CartManager() {
  // State cho danh sách cart
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State cho form tạo mới
  const [name, setName] = useState('');
  // Mặc định lấy thời gian hiện tại + 1 ngày để làm mẫu
  const [notifyAt, setNotifyAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 19));

  // 1. Hàm GET: Lấy danh sách cart
  const fetchCarts = async () => {
    try {
      const response = await fetch(`${API_URL}/cart`); // Đường dẫn API GET của bạn
      const data = await response.json();

      // Sắp xếp mới nhất lên đầu (tùy chọn)
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

  // Gọi API khi màn hình load lần đầu
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
      const payload = {
        name: name,
        notify_at: notifyAt, // Gửi chuỗi ISO 8601
      };

      const response = await fetch(`${API_URL}/cart`, { // Đường dẫn API POST của bạn
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Thành công', 'Đã tạo Cart mới!');
        setName(''); // Reset ô nhập
        fetchCarts(); // Load lại danh sách ngay lập tức
      } else {
        Alert.alert('Thất bại', 'Server trả về lỗi');
      }
    } catch (error) {
      console.error('Lỗi tạo cart:', error);
      Alert.alert('Lỗi', 'Không thể tạo cart');
    }
  };

  // Xử lý kéo xuống để refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCarts();
  };

  // Component hiển thị từng dòng trong danh sách
  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN');
  };
  const executeDelete = async (id: number) => {
    try {
      // Gọi API
      const response = await fetch(`${API_URL}/cart/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Thêm Authorization nếu API yêu cầu token
          // 'Authorization': `Bearer ${token}` 
        },
      });

      if (response.ok) {
        // A. XÓA THÀNH CÔNG
        console.log(`Đã xóa item ${id} thành công trên server`);

        // QUAN TRỌNG: Cập nhật lại State để giao diện tự mất item đó
        // (Thay 'setCartList' bằng tên hàm set state thực tế của bạn)
        setCarts((prevList) => prevList.filter((item) => item.id !== id));

        // Thông báo nhẹ (Tuỳ chọn)
        if (Platform.OS !== 'web') {
          Alert.alert("Thành công", "Đã xóa đơn hàng.");
        }
      } else {
        // B. LỖI TỪ SERVER (ví dụ 404, 500)
        Alert.alert("Thất bại", "Không thể xóa đơn hàng lúc này.");
      }
    } catch (error) {
      // C. LỖI MẠNG / CODE
      console.error("Lỗi xóa:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi kết nối server.");
    }
  };

  const handleDelete = (id: number) => {
    console.log("Nút xóa được bấm, ID:", id);

    // --- MÔI TRƯỜNG WEB ---
    if (Platform.OS === 'web') {
      // Dùng window.confirm của trình duyệt
      const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa giỏ hàng này không?");
      if (confirmDelete) {
        executeDelete(id); // Gọi hàm xóa
      }
    }
    // --- MÔI TRƯỜNG APP (Android/iOS) ---
    else {
      Alert.alert(
        "Xác nhận xóa",
        "Bạn có chắc chắn muốn xóa giỏ hàng này không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive", // Màu đỏ trên iOS
            onPress: () => {
              executeDelete(id); // Gọi hàm xóa
            }
          }
        ]
      );
    }
  };
  // === 3. CẬP NHẬT HÀM RENDER ITEM ===
  const renderItem = ({ item }: { item: Cart }) => (
    <TouchableOpacity
      style={styles.card}
      // SỰ KIỆN BẤM VÀO CARD ĐỂ XEM CHI TIẾT
      onPress={() => {
        router.push({
          pathname: '/list/[id]',
          params: { id: item.id }
        });
      }}
    >
      <View style={styles.cardHeader}>
        {/* Phần thông tin bên trái */}
        <View style={styles.headerInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardId}>ID: {item.id}</Text>
        </View>

        {/* Nút Xóa bên phải */}
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
      {/* --- PHẦN FORM NHẬP LIỆU --- */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>Tạo Cart Mới</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập tên Cart (VD: Mua đồ tết)"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Thời gian (YYYY-MM-DDTHH:mm:ss)"
          value={notifyAt}
          onChangeText={setNotifyAt}
        />
        <Text style={styles.hint}>Định dạng: YYYY-MM-DDTHH:mm:ss</Text>

        <TouchableOpacity style={styles.button} onPress={handleCreateCart}>
          <Text style={styles.buttonText}>TẠO MỚI</Text>
        </TouchableOpacity>
      </View>

      {/* --- PHẦN DANH SÁCH --- */}
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

// Hàm format ngày giờ cho đẹp
const formatDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN'); // Chuyển sang giờ Việt Nam
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  // --- Style cho Form (Giữ nguyên) ---
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
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    marginTop: -5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // --- Style cho Danh sách (CẬP NHẬT) ---
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
    // Thêm bóng đổ nhẹ cho card đẹp hơn
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // 1. Sửa lại header để căn giữa theo chiều dọc
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Quan trọng: căn giữa nút xóa và text
    marginBottom: 8,
    borderBottomWidth: 1, // (Tuỳ chọn) Thêm gạch chân mờ ngăn cách
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },

  // 2. Thêm style bao quanh Title và ID
  headerInfo: {
    flex: 1,          // Chiếm hết khoảng trống bên trái
    marginRight: 10,  // Cách nút xóa ra 1 đoạn
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
    marginTop: 2, // Cách title ra 1 xíu
  },

  // 3. Thêm style cho nút Xóa
  deleteButton: {
    backgroundColor: '#ffebee', // Màu nền đỏ rất nhạt
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#d32f2f', // Màu chữ đỏ đậm
    fontSize: 12,
    fontWeight: 'bold',
  },

  // --- Phần Body giữ nguyên ---
  cardBody: {
    marginTop: 5,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
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
    textAlign: 'right', // Đẩy ngày tạo sang phải cho gọn (tuỳ chọn)
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
});