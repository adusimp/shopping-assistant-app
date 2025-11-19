import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../carts/entities/cart.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { CartProduct } from './entities/cart-product.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(CartProduct)
    private readonly cartProductRepo: Repository<CartProduct>,
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
        '(p.price * cp.quantity) AS total_price',
      ])
      .getRawMany();

    return rows;
  }
}
