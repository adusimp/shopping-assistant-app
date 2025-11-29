
// 1. DTO cho API Gợi ý giá (Gửi Tên + ID nếu có)
export class SuggestPriceDto {
  productName: string; 
  productId?: number;  
}

// 2. DTO cho API Cập nhật giá (Gửi ID + Giá chốt)
export class UpdatePriceDto {

  id: number;          
  price: number;       
}