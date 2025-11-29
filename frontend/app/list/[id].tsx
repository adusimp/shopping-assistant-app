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
  is_bought: boolean;
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
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [targetItem, setTargetItem] = useState<CartItem | null>(null); // Món đang được check
  const [aiPrice, setAiPrice] = useState<number>(0); // Giá AI tìm được
  const [loadingAiPrice, setLoadingAiPrice] = useState(false);

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

  // --- 1. STATE CHO AI ---
  const [modalSuggestVisible, setModalSuggestVisible] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<any[]>([]);

// --- HÀM TÍCH ĐÃ MUA ---
  const handleToggleStatus = async (item: CartItem) => {
    // 1. Cập nhật giao diện NGAY LẬP TỨC (Optimistic)
    const originalItems = [...items]; // Backup để revert nếu lỗi
    
    setItems((prevItems) => 
      prevItems.map((i) => 
        i.product_id === item.product_id 
          ? { ...i, is_bought: !i.is_bought } 
          : i
      )
    );

    try {
      // 2. Gọi API
      await fetch(`${API_URL}/cart/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            cartId: Number(cartId), 
            productId: item.product_id 
        }),
      });
      // Thành công thì không cần làm gì thêm vì UI đã update rồi
      fetchCartItems()
    } catch (error) {
      console.error("Lỗi toggle:", error);
      // Nếu lỗi thì revert lại danh sách cũ
      setItems(originalItems); 
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };
  // 1. Hàm được gọi khi bấm nút trên Item
  const openPriceSuggestion = async (item: CartItem) => {
    setTargetItem(item);       // Lưu món đang chọn
    setPriceModalVisible(true); // Mở Modal lên ngay
    setLoadingAiPrice(true);    // Bật xoay xoay
    setAiPrice(0);              // Reset giá cũ

    try {
      // Gọi API Suggest (Ưu tiên tìm theo ID)
      const res = await fetch(`${API_URL}/cart/suggest-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: item.name,
          productId: item.product_id
        }),
      });
      const data = await res.json();

      // data trả về: { price: 15000, ... }
      setAiPrice(Number(data.aiPrice) || 0);

    } catch (error) {
      console.error("Lỗi AI Price:", error);
      Alert.alert("Lỗi", "Không thể lấy giá từ AI lúc này");
    } finally {
      setLoadingAiPrice(false);
    }
  };

  // 2. Hàm được gọi khi bấm "Xác nhận cập nhật" trong Modal
  const handleConfirmUpdatePrice = async () => {
    if (!targetItem || aiPrice <= 0) return;

    try {
      // Gọi API Update Price
      const res = await fetch(`${API_URL}/cart/update-price`, {
        method: 'POST', // hoặc PUT tùy backend bạn
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetItem.product_id,
          price: aiPrice
        }),
      });

      if (res.ok) {
        Alert.alert("Thành công", "Đã cập nhật giá mới vào kho dữ liệu!");
        setPriceModalVisible(false); // Đóng modal

        // Quan trọng: Load lại danh sách để hiển thị giá mới (nếu API list lấy giá từ Product)
        fetchCartItems();
      } else {
        Alert.alert("Lỗi", "Không cập nhật được giá.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi mạng", "Kiểm tra kết nối");
    }
  };


  // --- 2. GỌI AI ĐỂ LẤY GỢI Ý ---
  const handleGetSuggestion = async () => {
    if (!cart || !cart.name) return; // Kiểm tra xem đã load được thông tin cart chưa

    setIsSuggesting(true);
    setSelectedSuggestions([]); // Reset lựa chọn
    try {
      // Gọi API Suggest mà chúng ta đã viết ở backend
      const response = await fetch(`${API_URL}/cart/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartName: cart.name }),
      });

      const data = await response.json();
      if (data.items) {
        setSuggestedItems(data.items);
        setModalSuggestVisible(true);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "AI đang bận, thử lại sau nhé!");
    } finally {
      setIsSuggesting(false);
    }
  };
  const sortItems = (list: CartItem[]) => {
    return list.sort((a, b) => {
        if (a.is_bought === b.is_bought) return 0;
        return a.is_bought ? 1 : -1; // true (đã mua) lớn hơn -> nằm dưới
    });
};


  // --- 3. XỬ LÝ TÍCH CHỌN ---
  const toggleSuggestion = (item: any) => {
    const exists = selectedSuggestions.find(i => i.name === item.name);
    if (exists) {
      setSelectedSuggestions(prev => prev.filter(i => i.name !== item.name));
    } else {
      setSelectedSuggestions(prev => [...prev, item]);
    }
  };

  // --- 4. LƯU CÁC MÓN ĐÃ CHỌN VÀO GIỎ HÀNG (DÙNG API MỚI) ---
  const handleConfirmSuggestions = async () => {
    if (selectedSuggestions.length === 0) return;

    // Bật loading để chặn người dùng bấm lung tung
    setIsSuggesting(true);

    try {
      // 1. Chuẩn bị dữ liệu (Payload) đúng form Backend yêu cầu
      const payload = {
        cartId: Number(id), // Chuyển id từ params (string) sang number
        items: selectedSuggestions.map(item => ({
          type: item.type, // 'NEW' hoặc 'EXISTING'
          id: item.type === 'EXISTING' ? item.id : undefined, // Nếu NEW thì không cần gửi ID
          name: item.name,
          price: item.price ? Number(item.price) : 0, // Đảm bảo giá là số
          img_url: item.img_url || null
        }))
      };

      console.log("Gửi payload lên server:", payload);

      // 2. Gọi API Bulk Insert (Gửi 1 lần duy nhất)
      const response = await fetch(`${API_URL}/cart/add-ai-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // A. Thành công
        Alert.alert("Thành công", `Đã thêm ${selectedSuggestions.length} món vào giỏ hàng!`);
        setModalSuggestVisible(false); // Đóng Modal
        setSelectedSuggestions([]);    // Reset lựa chọn

        // Load lại danh sách sản phẩm trong giỏ để thấy món mới
        fetchCartItems();
      } else {
        // B. Lỗi từ server trả về
        const errData = await response.json();
        Alert.alert("Lỗi Server", errData.message || "Không thể thêm sản phẩm.");
      }

    } catch (error) {
      console.error("Lỗi mạng:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến server.");
    } finally {
      setIsSuggesting(false); // Tắt loading
    }
  };

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

  // --- HÀM XÓA TOÀN BỘ GIỎ HÀNG ---
  const handleClearCart = () => {
    // 1. Kiểm tra nếu giỏ hàng đang trống thì thôi
    if (items.length === 0) {
      if (Platform.OS !== 'web') {
        Alert.alert("Thông báo", "Giỏ hàng đang trống!");
      }
      return;
    }

    // 2. Logic gọi API xóa
    const executeClear = async () => {
      try {
        const response = await fetch(`${API_URL}/cart/${id}/clear`, { // id lấy từ params
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // A. Thành công
          console.log("Đã dọn sạch giỏ hàng");

          // Cập nhật State: Xóa sạch danh sách item đang hiển thị
          setItems([]);

          // Nếu muốn load lại từ server cho chắc chắn thì gọi:
          // fetchCartItems();

          if (Platform.OS !== 'web') {
            Alert.alert("Thành công", "Đã xóa tất cả sản phẩm trong giỏ.");
          }
        } else {
          // B. Lỗi Server
          Alert.alert("Lỗi", "Không thể dọn giỏ hàng lúc này.");
        }
      } catch (error) {
        console.error("Lỗi Clear Cart:", error);
        Alert.alert("Lỗi mạng", "Vui lòng kiểm tra kết nối.");
      }
    };

    // 3. Hiển thị hộp thoại xác nhận (Web vs Mobile)
    if (Platform.OS === 'web') {
      const confirm = window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ sản phẩm trong giỏ hàng này không?");
      if (confirm) {
        executeClear();
      }
    } else {
      Alert.alert(
        "Xác nhận dọn giỏ hàng",
        "Bạn có chắc chắn muốn xóa TẤT CẢ sản phẩm không? Hành động này không thể hoàn tác.",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa sạch",
            onPress: executeClear,
            style: "destructive" // Nút màu đỏ trên iOS
          }
        ]
      );
    }
  };

  // --- HÀM XÓA 1 SẢN PHẨM KHỎI GIỎ ---
  const handleDeleteItem = (productId: number) => {

    // 1. Định nghĩa logic gọi API xóa
    const executeDelete = async () => {
      try {
        // Gọi API: DELETE /cart/:cartid/items/:productid
        const response = await fetch(`${API_URL}/cart/${id}/items/${productId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log(`Đã xóa product ${productId} khỏi cart ${id}`);

          // CẬP NHẬT UI: Lọc bỏ item vừa xóa ra khỏi danh sách hiện tại
          // Lưu ý: item.product_id hay item.id tuỳ thuộc vào dữ liệu API trả về list items của bạn
          // Ở đây mình giả định items trong state có trường 'product_id' hoặc 'id' khớp với productId truyền vào
          setItems((prevItems) => prevItems.filter((item) =>
            (item.product_id) !== productId
          ));

          // Thông báo nhẹ (chỉ hiện trên Mobile, Web không cần thiết vì danh sách tự mất)
          if (Platform.OS !== 'web') {
            // ToastAndroid.show("Đã xóa", ToastAndroid.SHORT); // Hoặc dùng Alert nếu thích
          }
        } else {
          Alert.alert("Lỗi", "Không thể xóa sản phẩm lúc này.");
        }
      } catch (error) {
        console.error("Lỗi xóa item:", error);
        Alert.alert("Lỗi mạng", "Vui lòng kiểm tra kết nối server.");
      }
    };

    // 2. Hiển thị xác nhận (Phân biệt Web và Mobile)
    if (Platform.OS === 'web') {
      const confirm = window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?");
      if (confirm) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Xác nhận xóa",
        "Bạn muốn bỏ sản phẩm này khỏi giỏ hàng?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            onPress: executeDelete,
            style: "destructive" // Nút màu đỏ trên iOS
          }
        ]
      );
    }
  };

  const fetchCartItems = async () => {
    try {
      const res = await fetch(`${API_URL}/product/product-in-cart/${cartId}`);
      const data = await res.json();
      setItems(sortItems(data));
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
    <View style={[
        styles.itemRow, 
        item.is_bought && { backgroundColor: '#f9f9f9', opacity: 0.7 } // Làm mờ nhẹ nếu đã mua
    ]}>
      
      {/* --- NÚT CHECKBOX (TRÁI) --- */}
      <TouchableOpacity 
        onPress={() => handleToggleStatus(item)}
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
                item.is_bought && { textDecorationLine: 'line-through', color: '#999' } // Gạch ngang chữ
            ]} 
            numberOfLines={2}
        >
            {item.name}
        </Text>
        <Text style={styles.itemQuantity}>Số lượng: x{item.quantity}</Text>
        
        {/* Nút check giá AI (Giữ nguyên) */}
        <TouchableOpacity onPress={() => openPriceSuggestion(item)} style={{marginTop: 5, flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="pricetags-outline" size={14} color="#007AFF" />
            <Text style={{fontSize: 12, color: '#007AFF', marginLeft: 4}}>Check giá AI</Text>
        </TouchableOpacity>
      </View>

      {/* Cột bên phải */}
      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
        <Text style={[
            styles.itemPrice,
            item.is_bought && { color: '#999' } // Làm mờ giá tiền
        ]}>
            {formatCurrency(item.total_price)}
        </Text>
        
        <TouchableOpacity 
          style={{ marginTop: 8, padding: 4 }} 
          onPress={() => handleDeleteItem(item.product_id)}
        >
          <Text style={{ color: '#ff3b30', fontSize: 12, fontWeight: '600' }}>Xóa</Text>
        </TouchableOpacity>
      </View>
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
      {/* KHU VỰC NÚT BẤM */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>


        {/* NÚT AI GỢI Ý (MỚI) */}
        <TouchableOpacity
          style={[styles.btn, { flex: 1, backgroundColor: '#6C5CE7', flexDirection: 'row', justifyContent: 'center', gap: 5 }]}
          onPress={handleGetSuggestion}
          disabled={isSuggesting}
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
      <View style={{
        flexDirection: 'row',       // 1. Xếp ngang
        justifyContent: 'space-between', // 2. Đẩy 1 cái sang trái, 1 cái sang phải
        alignItems: 'center',       // 3. Căn giữa theo chiều dọc
        marginBottom: 10
      }}>
        <Text style={{ marginLeft: 15, fontWeight: '600', color: '#666' }}>
          Giỏ hàng ({items.length})
        </Text>

        <TouchableOpacity onPress={handleClearCart}>
          <Text style={{ marginRight: 15, fontWeight: '600', color: 'red' }}>
            Xóa tất cả
          </Text>
        </TouchableOpacity>
      </View>
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
              {/* Nhập Tên */}
              <Text style={styles.label}>Tên sản phẩm (*):</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="VD: Bánh kẹo..."
              />

              {/* --- PHẦN CHỌN ẢNH (ĐÃ BỔ SUNG) --- */}
              <Text style={styles.label}>Ảnh sản phẩm:</Text>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerBtn}>
                  {newImage ? (
                    <Image source={{ uri: newImage }} style={styles.imagePreview} />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      {/* Bạn có thể thay Text bằng Icon Camera nếu muốn */}
                      <Text style={{ fontSize: 30, color: '#ccc', marginBottom: 5 }}>📷</Text>
                      <Text style={{ color: '#666' }}>+ Chọn ảnh từ thư viện</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Nút xóa ảnh nếu chọn nhầm */}
                {newImage ? (
                  <TouchableOpacity onPress={() => setNewImage('')} style={{ padding: 5 }}>
                    <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '500' }}>Xóa ảnh</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {/* ---------------------------------- */}

              {/* Nhập Giá & Số lượng */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Giá (VNĐ):</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ width: '48%' }}>
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

              {/* Chọn Category */}
              <Text style={styles.label}>Loại (Category):</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newCategory}
                  onValueChange={(itemValue) => setNewCategory(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <Picker.Item key={key} label={label} value={key} />
                  ))}
                </Picker>
              </View>

            </ScrollView>

            {/* Nút Hủy / Lưu */}
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
      <Modal
        visible={modalSuggestVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalSuggestVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gợi ý cho "{cart?.name}"</Text>
            <Text style={styles.modalSubtitle}>AI tìm thấy các món sau:</Text>

            <ScrollView style={styles.suggestionList}>
              {suggestedItems.map((item, index) => {
                const isSelected = selectedSuggestions.some(i => i.name === item.name);
                const isExisting = item.type === 'EXISTING';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, isSelected && styles.suggestionItemSelected]}
                    onPress={() => toggleSuggestion(item)}
                  >
                    {/* Checkbox */}
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={{ color: 'white', fontSize: 12 }}>✓</Text>}
                    </View>

                    {/* Nội dung */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {isExisting ? (
                        <Text style={styles.tagExisting}>✅ Có sẵn • {item.price}đ</Text>
                      ) : (
                        <Text style={styles.tagNew}>⚠️ Mới (Chưa có trong kho)</Text>
                      )}
                    </View>

                    {/* Ảnh */}
                    {item.img_url && <Image source={{ uri: item.img_url }} style={styles.itemThumb} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalSuggestVisible(false)}>
                <Text style={{ color: '#666' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirmSuggestions}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Thêm ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL CHECK GIÁ AI --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={priceModalVisible}
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 320 }]}>
            <Text style={styles.modalTitle}>Đề xuất giá AI 🤖</Text>

            {targetItem && (
              <View style={{ width: '100%', marginVertical: 15 }}>
                <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>
                  {targetItem.name}
                </Text>

                {/* So sánh giá */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: '#666' }}>Giá hiện tại:</Text>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>
                    {/* Tính giá đơn vị: Total / Quantity */}
                    {formatCurrency((parseFloat(targetItem.total_price) / targetItem.quantity).toString())}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 5 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ color: '#666' }}>Giá AI gợi ý:</Text>

                  {loadingAiPrice ? (
                    <ActivityIndicator size="small" color="#6C5CE7" />
                  ) : (
                    <Text style={{ fontWeight: 'bold', color: '#6C5CE7', fontSize: 18 }}>
                      {aiPrice>0? formatCurrency(aiPrice.toString()) : 'chưa rõ'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={styles.btnText}>Giữ giá cũ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: (loadingAiPrice || aiPrice <= 0) ? '#ccc' : '#6C5CE7' }
                ]}
                onPress={handleConfirmUpdatePrice}
                disabled={loadingAiPrice || aiPrice <= 0}
              >
                <Text style={[styles.btnText, { color: 'white' }]}>Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  // --- HEADER CỦA SCREEN (Phần thông tin Cart) ---
  headerSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
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
    fontSize: 18,
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
  input: { // Input sửa tên Cart
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

  // --- KHU VỰC NÚT BẤM (Thêm thủ công + AI) ---
  // Style cho hàng chứa 2 nút thêm
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
    paddingHorizontal: 15 // Thêm padding nếu nút bị sát lề
  },

  // --- ITEM TRONG DANH SÁCH (Sản phẩm đã thêm) ---
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16
  },

  // --- [BỔ SUNG] HEADER CỦA MÀN HÌNH CHI TIẾT (Có nút Back) ---
  modalListHeader: {
    height: 50, // Hoặc 60 tùy thiết kế
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
    // Nếu dùng SafeAreaView thì có thể bỏ margin này, 
    // nếu dùng View thường thì giữ lại để tránh tai thỏ
    marginTop: Platform.OS === 'ios' ? 40 : 0
  },

  // --- CÁC MODAL (CHUNG) ---
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
    marginBottom: 5,
    textAlign: 'center',
    color: '#333'
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 15
  },

  // --- FORM INPUT TRONG MODAL ---
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
    marginTop: 10
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
  },

  // --- NÚT BẤM (Footer Modal) ---
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center'
  },
  btn: { // Style nút chung
    flex: 1, // Để chia đều chiều ngang nếu cần
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCancel: {
    backgroundColor: '#f2f2f7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10
  },
  btnSave: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2
  },
  btnConfirm: { // Nút xác nhận AI
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600'
  },

  // Footer của Modal AI (để căn chỉnh nút Hủy và Thêm)
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
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
    borderStyle: 'dashed',
    marginTop: 5,
    marginBottom: 5
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },

  // --- AI SUGGESTION LIST (MỚI) ---
  suggestionList: {
    marginBottom: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa'
  },
  suggestionItemSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#F0F0FF'
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white'
  },
  checkboxChecked: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7'
  },

  // Tag phân loại
  tagExisting: {
    fontSize: 12,
    color: '#00b894',
    marginTop: 4,
    fontWeight: '500'
  },
  tagNew: {
    fontSize: 12,
    color: '#e17055',
    marginTop: 4,
    fontWeight: '500'
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginLeft: 10,
    backgroundColor: '#eee'
  },
  checkPriceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start', // Để nút không bị kéo dài hết chiều ngang
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E0E0FF'
  },
  checkPriceText: {
    fontSize: 12,
    color: '#6C5CE7',
    marginLeft: 4,
    fontWeight: '500'
  }
});