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
import { SuggestPriceDto, UpdatePriceDto } from './dtos/price-suggestion.dto';
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
    @InjectRepository(CartProduct)
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
      if (dto.budget !== undefined) {
        cart.budget = dto.budget;
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
      // 1. SỬA PROMPT: Yêu cầu trả về kèm GIÁ
      const prompt = `
        Tôi muốn mua sắm cho dịp: "${cartName}".
        Hãy liệt kê 5-10 món đồ CỤ THỂ, QUAN TRỌNG NHẤT kèm theo GIÁ TIỀN ƯỚC LƯỢNG (VND).
        
        QUY TẮC BẮT BUỘC (STRICT MODE):
        1. Chỉ trả về danh sách thô, MỖI MÓN 1 DÒNG.
        2. ĐỊNH DẠNG: Tên sản phẩm | Giá tiền (chỉ số).
        3. KHÔNG dùng ký tự đầu dòng (-, 1., *).
        4. KHÔNG bao quanh bằng dấu ngoặc kép.
        5. Tên món phải cụ thể, ngắn gọn (2-5 từ).
        6. Giá tiền là giá trung bình tại Việt Nam (VND).
        
        Ví dụ output chuẩn (làm y hệt thế này):
        Bánh kem bắp | 350000
        Nến sinh nhật số | 15000
        Mũ chóp giấy | 20000
        Pháo bông que | 50000
      `;

      const result = await this.model.generateContent(prompt);
      const text = result.response.text();

      // 2. PARSE KẾT QUẢ (Tách Tên và Giá)
      let aiItems = text
        .split('\n')
        .map(line => {
          // Xử lý dòng: "Bánh kem | 350000"
          const parts = line.split('|');
          const name = parts[0]?.trim(); // Lấy "Bánh kem"
          
          // Lấy giá, xóa bỏ chữ 'đ', 'vnd', dấu chấm phẩy nếu có
          const priceStr = parts[1]?.trim() || '0';
          const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;

          return { name, price };
        })
        .filter(item => item.name && item.name.length > 0 && !item.name.startsWith('```'));

      // 3. LOGIC TÌM KIẾM
      const suggestions = await Promise.all(
        aiItems.map(async (aiItem) => {
          const keyword = aiItem.name;
          
          const qb = this.productRepository.createQueryBuilder('product');

          // Tách từ khóa để tìm kiếm
          const terms = keyword.split(' ').filter(t => t.length >= 2);

          if (terms.length > 0) {
              terms.forEach((term, index) => {
                  if (index === 0) {
                      qb.where(`product.name LIKE :term${index}`, { [`term${index}`]: `%${term}%` });
                  } else {
                      qb.andWhere(`product.name LIKE :term${index}`, { [`term${index}`]: `%${term}%` });
                  }
              });
          } else {
              qb.where(`product.name LIKE :full`, { full: `%${keyword}%` });
          }

          const existingProduct = await qb.getOne();

          if (existingProduct) {
            return {
              type: 'EXISTING',
              id: existingProduct.id,
              name: existingProduct.name, // Ưu tiên tên chuẩn trong DB
              price: existingProduct.price, // Ưu tiên giá chuẩn trong DB
              img_url: existingProduct.img_url,
              original_keyword: keyword,
            };
          } else {
            // --- LOGIC MỚI: DÙNG GIÁ CỦA AI ---
            return {
              type: 'NEW',
              id: null,
              name: keyword, // Tên từ AI
              price: aiItem.price, // <--- LẤY GIÁ AI ĐỀ XUẤT TẠI ĐÂY
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

  async removeItemFromCart(cartId: number, productId: number) {
    try {
      await this.dataSource.manager.delete(CartProduct,{ cart_id: cartId, product_id: productId });
      return { message: 'Item removed from cart' };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async removeAllItemsFromCart(cartId: number) {
    try {
      await this.dataSource.manager.delete(CartProduct,{ cart_id: cartId });
      return { message: 'All items removed from cart' };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // API 1: GỢI Ý GIÁ (Sửa đổi: Luôn hỏi AI)
  async suggestPrice(dto: SuggestPriceDto) {
    const { productName, productId } = dto;
    
    let foundId: number | null = productId || null;
    let historyPrice = 0;
    let aiPrice = 0;

    // BƯỚC 1: TÌM THÔNG TIN TRONG DB (Để lấy ID và Giá cũ)
    let existingProduct ;
    
    if (productId) {
      existingProduct = await this.productRepository.findOne({ where: { id: productId } });
    } else {
      existingProduct = await this.productRepository.findOne({
        where: { name: ILike(`%${productName}%`) },
        order: { id: 'DESC' },
      });
    }

    if (existingProduct) {
      foundId = existingProduct.id;
      historyPrice = Number(existingProduct.price); // Lưu lại giá cũ để tham khảo
    }

    // BƯỚC 2: LUÔN LUÔN HỎI AI (Bỏ đoạn check if (historyPrice > 0) return...)
    try {
      // Prompt nhấn mạnh việc lấy giá hiện tại
      const prompt = `
        Định giá thị trường hiện tại ở Việt Nam cho sản phẩm: "${productName}".
        YÊU CẦU: 
        1. Trả về MỘT SỐ NGUYÊN DUY NHẤT (VND). 
        2. Không giải thích. Ví dụ: 15000.
        3. Nếu không xác định được, trả về 0.
      `;
      
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/[^0-9]/g, '');
      aiPrice = parseInt(text) || 0;
      
    } catch (error) {
      console.error('AI Suggest Price Error:', error);
      // Nếu AI lỗi, aiPrice vẫn là 0
    }

    // BƯỚC 3: TRẢ VỀ CẢ HAI
    console.log(foundId, historyPrice, aiPrice);
    return {
      id: foundId,       // ID sản phẩm trong kho (quan trọng để update)
      aiPrice: aiPrice,  // Giá mới từ AI
      historyPrice: historyPrice, // Giá cũ trong kho
      
      // Logic gợi ý cuối cùng: Nếu AI có giá thì lấy AI, không thì lấy lịch sử
      suggestedPrice: aiPrice > 0 ? aiPrice : historyPrice, 
      source: aiPrice > 0 ? 'AI' : (historyPrice > 0 ? 'HISTORY' : 'NONE')
    };
    
  }
  // ... (Hàm suggestPrice đã viết ở câu trả lời trước) ...

  // API 2: CẬP NHẬT GIÁ
  async updatePrice(dto: UpdatePriceDto) {
    const { id, price } = dto;

    // 1. Kiểm tra sản phẩm có tồn tại không
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Sản phẩm ID ${id} không tồn tại`);
    }

    // 2. Thực hiện Update
    await this.productRepository.update(id, { price });

    return { 
      success: true, 
      message: 'Đã cập nhật giá mới thành công', 
      id, 
      newPrice: price 
    };
  }

  // --- HÀM TOGGLE TRẠNG THÁI MUA ---
  async toggleItemStatus(cartId: number, productId: number) {
    // 1. Tìm item trong bảng nối
    const cartItem = await this.cartProductRepository.findOne({
      where: { cart_id: cartId, product_id: productId },
    });

    if (!cartItem) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    // 2. Đảo trạng thái
    cartItem.is_bought = !cartItem.is_bought;

    // 3. Lưu lại
    await this.cartProductRepository.save(cartItem);

    return { 
      message: 'Đã cập nhật trạng thái', 
      is_bought: cartItem.is_bought,
      product_id: productId 
    };
  }

}
