import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';

// 1. Định nghĩa lại Interface Item (chỉ lấy những trường cần thiết)
interface CartItem {
  name: string;
  total_price: string;
  quantity: number;
}

// 2. Định nghĩa Props cho Modal
interface PriceCheckModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetItem: CartItem | null;
  aiPrice: number;
  loading: boolean;
}

// 3. Helper format tiền (để hiển thị đẹp)
const formatCurrency = (price: string | number) => {
  const numberPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numberPrice)) return '0 ₫';
  return numberPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export const PriceCheckModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  targetItem, 
  aiPrice, 
  loading 
}: PriceCheckModalProps) => {
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 320 }]}>
          <Text style={styles.modalTitle}>Đề xuất giá AI 🤖</Text>

          {targetItem && (
            <View style={{ width: '100%', marginVertical: 15 }}>
              <Text style={styles.itemName}>
                {targetItem.name}
              </Text>

              {/* So sánh giá */}
              <View style={styles.rowBetween}>
                <Text style={{ color: '#666' }}>Giá hiện tại:</Text>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {/* Tính giá đơn vị: Total / Quantity */}
                  {formatCurrency(
                    (parseFloat(targetItem.total_price) / (targetItem.quantity || 1)).toString()
                  )}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <Text style={{ color: '#666' }}>Giá AI gợi ý:</Text>

                {loading ? (
                  <ActivityIndicator size="small" color="#6C5CE7" />
                ) : (
                  <Text style={styles.aiPriceText}>
                    {aiPrice > 0 ? formatCurrency(aiPrice.toString()) : 'Chưa rõ'}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onClose}
            >
              <Text style={styles.btnText}>Giữ giá cũ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: (loading || aiPrice <= 0) ? '#ccc' : '#6C5CE7' }
              ]}
              onPress={onConfirm}
              disabled={loading || aiPrice <= 0}
            >
              <Text style={[styles.btnText, { color: 'white' }]}>Cập nhật</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 4. Styles riêng cho Modal này
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
  itemName: {
    textAlign: 'center', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 15
  },
  rowBetween: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  divider: {
    height: 1, 
    backgroundColor: '#eee', 
    marginVertical: 5 
  },
  aiPriceText: {
    fontWeight: 'bold', 
    color: '#6C5CE7', 
    fontSize: 18
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center'
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
  btnText: {
    fontSize: 16,
    fontWeight: '600'
  }
});