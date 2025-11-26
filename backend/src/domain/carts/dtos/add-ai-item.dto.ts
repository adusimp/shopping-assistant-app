// DTO đơn giản, không cần class-validator
export interface AiItemInput {
  type: 'NEW' | 'EXISTING';
  id?: number;      // Có nếu là EXISTING
  name: string;     // Tên món
  price?: number;   // Giá (nếu có)
  img_url?: string; // Ảnh (nếu có)
}

export interface AddAiItemsBody {
  cartId: number;
  items: AiItemInput[];
}