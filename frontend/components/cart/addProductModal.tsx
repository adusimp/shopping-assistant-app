import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { ProductCategory } from '@/components/productListScreen'; // Import Enum Category của bạn (sửa đường dẫn nếu cần)

// 1. Định nghĩa Props
interface ManualAddModalProps {
  visible: boolean;
  onClose: () => void;
  // Hàm này sẽ gửi dữ liệu đã nhập về cho cha xử lý
  onAdd: (data: {
    name: string;
    price: string;
    quantity: string;
    category: string;
    imageUri: string;
  }) => void;
}

// 2. Danh sách Category
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

export const ManualAddModal = ({ visible, onClose, onAdd }: ManualAddModalProps) => {
  // --- STATE NỘI BỘ (Quản lý form tại đây) ---
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [imageUri, setImageUri] = useState('');
  const [category, setCategory] = useState(ProductCategory.OTHER);

  // Hàm reset form sau khi đóng hoặc lưu
  const resetForm = () => {
    setName('');
    setPrice('');
    setQuantity('1');
    setImageUri('');
    setCategory(ProductCategory.OTHER);
  };

  // Xử lý chọn ảnh
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Xử lý nút Lưu
  const handleSave = () => {
    if (!name.trim()) {
      alert("Vui lòng nhập tên sản phẩm");
      return;
    }
    // Gửi dữ liệu ra ngoài cho cha
    onAdd({
      name,
      price,
      quantity,
      category,
      imageUri
    });
    
    // Reset và đóng
    resetForm();
    onClose();
  };

  // Xử lý nút Hủy
  const handleCancel = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Thêm thủ công</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Tên sản phẩm */}
            <Text style={styles.label}>Tên sản phẩm (*):</Text>
            <TextInput
              style={styles.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="VD: Bánh kẹo..."
            />

            {/* 2. Chọn Ảnh (Code cũ đã khôi phục) */}
            <Text style={styles.label}>Ảnh sản phẩm:</Text>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={pickImage} style={styles.imagePickerBtn}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 30, color: '#ccc', marginBottom: 5 }}>📷</Text>
                    <Text style={{ color: '#666' }}>+ Chọn ảnh từ thư viện</Text>
                  </View>
                )}
              </TouchableOpacity>

              {imageUri ? (
                <TouchableOpacity onPress={() => setImageUri('')} style={{ padding: 5 }}>
                  <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '500' }}>Xóa ảnh</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 3. Giá & Số lượng (Code cũ đã khôi phục) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>Giá (VNĐ):</Text>
                <TextInput
                  style={styles.modalInput}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>Số lượng:</Text>
                <TextInput
                  style={styles.modalInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            </View>

            {/* 4. Category Picker (Code cũ đã khôi phục) */}
            <Text style={styles.label}>Loại (Category):</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
                mode="dropdown"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Picker.Item key={key} label={label} value={key} />
                ))}
              </Picker>
            </View>

          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleCancel}>
              <Text style={styles.btnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
              <Text style={[styles.btnText, { color: 'white' }]}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- STYLES RIÊNG (Copy từ file gốc để Component tự chạy được) ---
const styles = StyleSheet.create({
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
    maxHeight: '90%', // Tăng lên chút để chứa đủ nội dung
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa'
  },
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnCancel: {
    backgroundColor: '#f2f2f7',
    marginRight: 10
  },
  btnSave: {
    backgroundColor: '#34C759',
    elevation: 2
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600'
  },
});