import { ProductCategory } from "src/common/enum/product-categories.enum";

export class CreateProductDto {
  name: string;
  price: number;
  img_url: string;
  category: ProductCategory;
  barcode?: string;
}
