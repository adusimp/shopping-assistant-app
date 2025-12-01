import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';

// 1. Định nghĩa kiểu dữ liệu cho Item
interface SuggestionItem {
  name: string;
  type: 'NEW' | 'EXISTING';
  price: number | string;
  img_url?: string | null;
  id?: number; // Có nếu là EXISTING
}

// 2. Props nhận từ cha
interface AiSuggestModalProps {
  visible: boolean;
  onClose: () => void;
  cartName: string | undefined;
  suggestions: SuggestionItem[]; // Danh sách AI gợi ý
  onAddItems: (selectedItems: SuggestionItem[]) => void; // Hàm trả kết quả về cha
}

export const AiSuggestModal = ({
  visible,
  onClose,
  cartName,
  suggestions,
  onAddItems
}: AiSuggestModalProps) => {
  // --- STATE NỘI BỘ: Quản lý việc tích chọn ---
  const [selectedItems, setSelectedItems] = useState<SuggestionItem[]>([]);

  // Reset lựa chọn mỗi khi Modal mở ra hoặc danh sách gợi ý thay đổi
  useEffect(() => {
    if (visible) {
      setSelectedItems([]);
    }
  }, [visible, suggestions]);

  // Logic tích chọn (Checkbox)
  const toggleSuggestion = (item: SuggestionItem) => {
    const exists = selectedItems.find(i => i.name === item.name);
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.name !== item.name));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  // Logic bấm nút Thêm
  const handleConfirm = () => {
    onAddItems(selectedItems); // Gửi danh sách đã chọn về cho cha xử lý API
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Gợi ý cho "{cartName}"</Text>
          <Text style={styles.modalSubtitle}>AI tìm thấy các món sau:</Text>

          <ScrollView style={styles.suggestionList}>
            {suggestions.map((item, index) => {
              const isSelected = selectedItems.some(i => i.name === item.name);
              const isExisting = item.type === 'EXISTING';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionItem,
                    isSelected && styles.suggestionItemSelected
                  ]}
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
                  {item.img_url && (
                    <Image source={{ uri: item.img_url }} style={styles.itemThumb} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={{ color: '#666' }}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.btnConfirm, { opacity: selectedItems.length === 0 ? 0.5 : 1 }]} 
                onPress={handleConfirm}
                disabled={selectedItems.length === 0}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Thêm {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 3. Styles (Copy từ file gốc sang)
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  btnCancel: {
    backgroundColor: '#f2f2f7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10
  },
  btnConfirm: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
});