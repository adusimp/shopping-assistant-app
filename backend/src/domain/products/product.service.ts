import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cart } from '../carts/entities/cart.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { CartProduct } from './entities/cart-product.entity';
import { Product } from './entities/product.entity';
import { AddProductToCartDto } from './dtos/add-product-to-cart.dto';
import * as path from 'path';
import * as fs from 'fs';
import { ProductCategory } from 'src/common/enum/product-categories.enum';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(CartProduct)
    private readonly cartProductRepo: Repository<CartProduct>,
    private dataSource: DataSource,
  ) {}

  // === 1. Thêm sản phẩm mới ===
  async createProduct(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  // === 2. Thêm sản phẩm vào giỏ hàng ===
  async addToCart(dto: AddToCartDto) {
    const { cart_id, product_id, quantity } = dto;

    // Kiểm tra giỏ có tồn tại
    const cart = await this.cartRepo.findOne({ where: { id: cart_id } });
    if (!cart) throw new Error('Cart not found');

    // Kiểm tra sản phẩm có tồn tại
    const product = await this.productRepo.findOne({
      where: { id: product_id },
    });
    if (!product) throw new Error('Product not found');

    // Kiểm tra sản phẩm đã có trong giỏ chưa
    let cartProduct = await this.cartProductRepo.findOne({
      where: { cart_id, product_id },
    });

    if (cartProduct) {
      // Nếu có rồi → tăng số lượng
      cartProduct.quantity += quantity;
    } else {
      // Nếu chưa có → tạo record mới
      cartProduct = this.cartProductRepo.create({
        cart_id,
        product_id,
        quantity,
      });
    }

    return this.cartProductRepo.save(cartProduct);
  }
  async getProductsInCart(cartId: number) {
    const rows = await this.cartProductRepo
      .createQueryBuilder('cp')
      .innerJoinAndSelect('cp.product', 'p')
      .where('cp.cart_id = :cartId', { cartId })
      .select([
        'p.id AS product_id ',
        'p.name AS name',
        'p.img_url AS img_url',
        'cp.quantity AS quantity',
        'cp.is_bought AS is_bought',
        '(p.price * cp.quantity) AS total_price',
      ])
      .getRawMany();

    return rows;
  }
  async addProductToCart(dto: AddProductToCartDto, file: Express.Multer.File) {
    return await this.dataSource.transaction(async (manager) => {
      const { cart_id, name, price, quantity, category,barcode } = dto;

      let filePath = '';

      // 🔹 Lưu file
      if (file) {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

        const fileName = `${Date.now()}-${file.originalname}`;
        const savePath = path.join(uploadDir, fileName);

        fs.writeFileSync(savePath, file.buffer);

        filePath = `/uploads/${fileName}`;
      }

      // 🔹 Luôn tạo product mới
      const product = manager.create(Product, {
        name,
        price,
        img_url: filePath,
        category: category || ProductCategory.OTHER,
        barcode
      });
      await manager.save(product);

      // 🔹 Kiểm tra cart tồn tại
      const cart = await manager.findOne(Cart, {
        where: { id: cart_id },
      });

      if (!cart) throw new NotFoundException('Cart not found');

      // 🔹 Luôn tạo cartProduct mới
      const cartProduct = manager.create(CartProduct, {
        cart,
        product,
        quantity,
        price,
      });

      return await manager.save(cartProduct);
    });
  }

  async getAllProducts(page: number = 1, category?: ProductCategory) {
    try {
      const take = 5; // số item mỗi trang
      const skip = (page - 1) * take; // bỏ qua số bản ghi tương ứng

      const query = this.productRepo.createQueryBuilder('product');

      // nếu có filter category
      if (category) {
        query.where('product.category = :category', { category });
      }

      // lấy dữ liệu + tổng số bản ghi
      const [products, total] = await query
        .skip(skip)
        .take(take)
        .getManyAndCount();

      return {
        data: products,
        pagination: {
          currentPage: page,
          totalItems: total,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async findByBarcode(code: string) {
    return await this.productRepo.findOne({ where: { barcode: code } });
  }
}
