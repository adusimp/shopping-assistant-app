import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LoginView } from '@/components/loginScreen';
import { useUser } from '@/context/userContext';
import { router } from 'expo-router';

export default function IndexScreen() {
  const { user } = useUser();

  console.log(">>> INDEX SCREEN RENDER. User:", user);

  useEffect(() => {
    // Nếu user có dữ liệu -> Chuyển trang
    if (user) {
      console.log(">>> INDEX: Có user rồi, chuyển sang /home ngay!");
      // Dùng setTimeout 0 để đảm bảo render xong mới navigate
      setTimeout(() => {
        router.replace('/home');
      }, 0);
    }
  }, [user]);

  // Nếu đã có user thì hiện màn hình trắng chờ chuyển trang (tránh hiện lại login chớp nhoáng)
  if (user) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator size="large" />
        <Text>Đang vào trang chủ...</Text>
      </View>
    );
  }

  // Nếu chưa có user -> Hiện Login
  return <LoginView />;
}