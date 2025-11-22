import { ProductCategory } from "src/common/enum/product-categories.enum";

export class AddProductToCartDto {
  cart_id: number;
  name: string;
  price: number;
  quantity: number;
  category?: ProductCategory;
}