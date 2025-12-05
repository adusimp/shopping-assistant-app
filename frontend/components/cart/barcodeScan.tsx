import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera'; 
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFound: (product: any) => void;
  onNotFound: (barcode: string) => void;
}

export const BarcodeScannerModal = ({ visible, onClose, onFound, onNotFound }: Props) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  // 1. Xin quyền Camera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 2. --- FIX LỖI TẠI ĐÂY: Reset trạng thái mỗi khi mở Modal ---
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setProcessing(false);
    }
  }, [visible]);
  // -------------------------------------------------------------

  const handleBarCodeScanned = async ({ type, data }: any) => {
    // Nếu đang xử lý hoặc đã quét xong thì bỏ qua ngay
    if (scanned || processing) return;
    
    setScanned(true);   // Khóa không cho quét tiếp
    setProcessing(true); // Hiện loading
    console.log(`Quét được mã: ${data}`);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/product/barcode/${data}`);
      const result = await res.json();

      if (result.found) {
        // Tìm thấy sản phẩm -> Hỏi thêm vào giỏ
        Alert.alert(
            "Đã tìm thấy!", 
            `Sản phẩm: ${result.product.name}\nGiá: ${result.product.price} đ`, 
            [
                { 
                    text: "Quét lại", 
                    style: "cancel",
                    onPress: () => {
                        // Reset để quét mã khác
                        setScanned(false);
                        setProcessing(false);
                    }
                },
                { 
                    text: "Thêm vào giỏ", 
                    onPress: () => {
                        onFound(result.product);
                        onClose();
                    }
                }
            ]
        );
      } else {
        // Chưa có -> Hỏi tạo mới
        Alert.alert(
            "Chưa có dữ liệu", 
            `Mã vạch ${data} chưa có trong hệ thống.`, 
            [
                { 
                    text: "Hủy", 
                    style: 'cancel', 
                    onPress: () => {
                        setScanned(false);
                        setProcessing(false);
                    } 
                },
                { 
                    text: "Tạo món mới", 
                    onPress: () => {
                        onNotFound(data);
                        onClose();
                    }
                }
            ]
        );
      }
    } catch (error) {
        Alert.alert("Lỗi", "Không kết nối được server");
        setScanned(false);
        setProcessing(false);
    } finally {
        // Tắt loading trong mọi trường hợp (để Alert hiện ra rõ ràng)
        setProcessing(false); 
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Không có quyền truy cập Camera</Text>;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          // Chỉ quét khi chưa scanned và chưa processing
          onBarcodeScanned={(scanned || processing) ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_e"],
          }}
        />
        
        {/* Khung ngắm */}
        <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.text}>Di chuyển mã vạch vào khung</Text>
        </View>

        {/* Nút đóng */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* Loading Overlay */}
        {processing && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{color: 'white', marginTop: 10, fontWeight: 'bold'}}>Đang kiểm tra...</Text>
            </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#00FF00', backgroundColor: 'transparent' },
  text: { color: 'white', fontSize: 16, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 5 },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }
});