

export const getFullImageUrl = (imagePath: string | null) => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    if (!imagePath) return 'https://via.placeholder.com/150';
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    const baseUrl = API_URL?.replace(/\/$/, '');
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
  };
