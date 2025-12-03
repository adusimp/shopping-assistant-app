import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useUser } from '@/context/userContext';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const LoginView = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useUser();

    const handleAuth = async () => {
        console.log("1. Bắt đầu bấm nút đăng nhập..."); // LOG 1
        if (!email || !password) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (isRegistering && password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu nhập lại không khớp');
            return;
        }

        setLoading(true);
        const endpoint = isRegistering ? '/auth/register' : '/auth/login';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            // Log để kiểm tra (bạn đã thấy đúng rồi)
            console.log("SERVER RESPONSE:", data);

            if (res.ok) {
                if (isRegistering) {
                    Alert.alert("Thành công", "Đăng ký thành công! Hãy đăng nhập.");
                    setIsRegistering(false);
                    setConfirmPassword('');
                } else {
                    // --- SỬA LẠI ĐOẠN NÀY ---

                    // 1. Cập nhật Context
                    login({ user_id: data.user_id, email: data.email });

                    // 2. Ép buộc chuyển hướng sang màn hình chính (Tabs)
                    // Dùng setTimeout nhỏ để đảm bảo Context kịp cập nhật state
                   
                    // ------------------------
                }
            } else {
                Alert.alert('Thất bại', data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            Alert.alert('Lỗi mạng', 'Không thể kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}</Text>
                <Text style={styles.subtitle}>Shopping Assistant AI</Text>

                <Text style={styles.label}>Email:</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    placeholder="email@example.com"
                />

                <Text style={styles.label}>Mật khẩu:</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="******"
                />

                {isRegistering && (
                    <>
                        <Text style={styles.label}>Nhập lại mật khẩu:</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholder="******"
                        />
                    </>
                )}

                <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>{isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={{ marginTop: 20 }}>
                    <Text style={styles.linkText}>
                        {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', backgroundColor: '#f5f5f5', padding: 20 },
    card: { backgroundColor: 'white', padding: 25, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#333', marginBottom: 5 },
    subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#555' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#fafafa' },
    btn: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    linkText: { color: '#6C5CE7', textAlign: 'center', fontSize: 14, fontWeight: '500' }
});