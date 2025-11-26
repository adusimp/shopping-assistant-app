import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, ILike, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CreateCartDto } from './dtos/create-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Product } from '../products/entities/product.entity';
import { CartProduct } from '../products/entities/cart-product.entity';
import * as dotenv from 'dotenv';
import { ProductCategory } from 'src/common/enum/product-categories.enum';
import { AddAiItemsBody } from './dtos/add-ai-item.dto';
dotenv.config();

@Injectable()
export class CartService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Product)
    private cartProductRepository: Repository<CartProduct>,
    private dataSource : DataSource
  ) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async createCart(data: CreateCartDto): Promise<Cart> {
    try {
      const cart = this.cartRepository.create({
        name: data.name,
        notify_at: data.notify_at,
      });
      return this.cartRepository.save(cart);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async getAllCart() {
    try {
      const cart_list = await this.cartRepository.find();
      return cart_list;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async getCartById(id: number) {
    try {
      const cart = await this.cartRepository.findOne({ where: { id: id } });
      if (!cart) {
        throw new NotFoundException('cart not found');
      }
      return cart;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateCartById(id: number, dto: UpdateCartDto) {
    try {
      const cart = await this.cartRepository.findOne({ where: { id } });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      // Update fields if provided
      if (dto.name !== undefined) {
        cart.name = dto.name;
      }

      if (dto.notify_at !== undefined) {
        cart.notify_at = dto.notify_at;
      }

      return this.cartRepository.save(cart);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async deleteCart(id: number) {
    try {
      const result = await this.cartRepository.delete({ id: id });

      if (result.affected === 0) {
        return { message: `cart not found id : ${id}` };
      }

      return { message: 'delete success' };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  //AI function
async suggestProducts(cartName: string) {
    try {
      // 1. PROMPT (Giữ nguyên, yêu cầu trả về mỗi món 1 dòng)
      const prompt = `
        Tôi muốn mua sắm cho dịp: "${cartName}".
        Hãy liệt kê 5-10 món đồ CỤ THỂ, QUAN TRỌNG NHẤT.
        
        QUY TẮC BẮT BUỘC (STRICT MODE):
        1. Chỉ trả về danh sách thô (raw text), MỖI MÓN NẰM TRÊN 1 DÒNG.
        2. KHÔNG dùng ký tự đầu dòng như: gạch ngang (-), dấu sao (*), hay số thứ tự (1.).
        3. KHÔNG bao quanh tên món bằng dấu ngoặc kép (") hay dấu nháy (').
        4. KHÔNG có lời dẫn đầu hay kết thúc (Ví dụ: "Đây là danh sách...", "Hy vọng bạn thích...").
        5. Tên món phải cụ thể, ngắn gọn (2-5 từ)
        6. Phải là 1 món cụ thể không để từ ghép ví dụ : ly đĩa,...
        
        Ví dụ output chuẩn (làm y hệt thế này):
        Bánh kem bắp
        Nến sinh nhật số
        Mũ chóp giấy
        Pháo bông que
      `;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // Tách dòng
      let aiKeywords = text
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0 && !item.startsWith('```'));

      // 2. LOGIC TÌM KIẾM KHẮT KHE (AND LOGIC)
      const suggestions = await Promise.all(
        aiKeywords.map(async (keyword) => {
          
          const qb = this.productRepository.createQueryBuilder('product');

          // Tách từ khóa: "Bánh kem" -> ["Bánh", "kem"]
          // Lọc bỏ từ quá ngắn (dưới 2 ký tự) và các từ nối vô nghĩa nếu cần
          const terms = keyword.split(' ').filter(t => t.length >= 2);

          // --- LOGIC MỚI: BẮT BUỘC PHẢI KHỚP TẤT CẢ TỪ KHÓA ---
          if (terms.length > 0) {
              terms.forEach((term, index) => {
                  if (index === 0) {
                      // Từ đầu tiên dùng WHERE
                      qb.where(`product.name LIKE :term${index}`, { [`term${index}`]: `%${term}%` });
                  } else {
                      // Các từ sau dùng AND WHERE (Bắt buộc phải có)
                      qb.andWhere(`product.name LIKE :term${index}`, { [`term${index}`]: `%${term}%` });
                  }
              });
          } else {
              // Trường hợp keyword rỗng hoặc toàn từ 1 ký tự -> tìm chính xác
              qb.where(`product.name LIKE :full`, { full: `%${keyword}%` });
          }

          const existingProduct = await qb.getOne();

          if (existingProduct) {
            return {
              type: 'EXISTING',
              id: existingProduct.id,
              name: existingProduct.name,
              price: existingProduct.price,
              img_url: existingProduct.img_url,
              original_keyword: keyword,
            };
          } else {
            // Nếu không khớp đủ các từ -> Trả về NEW (An toàn hơn)
            return {
              type: 'NEW',
              id: null,
              name: keyword,
              price: 0,
              img_url: null,
              original_keyword: keyword,
            };
          }
        }),
      );

      return { items: suggestions };

    } catch (error) {
      console.error('Lỗi AI Suggest:', error);
      throw new InternalServerErrorException('Lỗi khi lấy gợi ý');
    }
  }

  async addAiItemsToCart(data: AddAiItemsBody) {
    const { cartId, items } = data;

    // 1. Bắt đầu Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Kiểm tra giỏ hàng có tồn tại không
      const cart = await queryRunner.manager.findOne(Cart, { where: { id: cartId } });
      if (!cart) throw new NotFoundException('Cart not found');

      for (const item of items) {
        let productId: number;

        // --- TRƯỜNG HỢP 1: SẢN PHẨM MỚI (NEW) ---
        if (item.type === 'NEW') {
          const newProduct = queryRunner.manager.create(Product, {
            name: item.name,
            price: item.price || 0,
            img_url: item.img_url || '',
            // Gán category mặc định vì AI không trả về enum này
            category: ProductCategory.OTHER, 
          });
          
          const savedProduct = await queryRunner.manager.save(newProduct);
          productId = savedProduct.id;
        } 
        
        // --- TRƯỜNG HỢP 2: SẢN PHẨM CÓ SẴN (EXISTING) ---
        else {
          if (!item.id) {
            throw new Error(`Sản phẩm EXISTING '${item.name}' bị thiếu ID`);
          }
          // Sau khi check if (!item.id) ở trên, TypeScript tự hiểu ở dưới này item.id chắc chắn là number
          productId = item.id;
        }

        // --- BƯỚC CHUNG: THÊM VÀO BẢNG CART_PRODUCT ---
        
        // Vì CartProduct dùng Composite Key (cart_id, product_id) 
        // nên ta query trực tiếp theo 2 cột này
        const existingEntry = await queryRunner.manager.findOne(CartProduct, {
          where: { 
            cart_id: cartId, 
            product_id: productId 
          }
        });

        if (existingEntry) {
          // Nếu đã có: Tăng số lượng
          existingEntry.quantity += 1;
          await queryRunner.manager.save(existingEntry);
        } else {
          // Nếu chưa có: Tạo dòng mới
          // Lưu ý: Entity CartProduct của bạn KHÔNG CÓ cột price, nên không lưu price vào đây
          const newEntry = queryRunner.manager.create(CartProduct, {
            cart_id: cartId,
            product_id: productId,
            quantity: 1,
            // Cần gán quan hệ object để TypeORM hiểu (dù đã có id) - Tuỳ version TypeORM
            // Nhưng với @PrimaryColumn như bạn khai báo thì gán id trực tiếp là quan trọng nhất
          });
          
          await queryRunner.manager.save(newEntry);
        }
      }

      // 2. Commit Transaction
      await queryRunner.commitTransaction();
      return { status: 'success', count: items.length };

    } catch (err) {
      // 3. Rollback nếu lỗi
      console.error("Transaction Error:", err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
