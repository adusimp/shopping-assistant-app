import { Cart } from 'src/domain/carts/entities/cart.entity';
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';


@Entity('cart_product')
export class CartProduct {
  @PrimaryColumn()
  cart_id: number;

  @PrimaryColumn()
  product_id: number;

  @Column()
  quantity: number;

  @Column({ default: false }) // Mặc định là chưa mua
  is_bought: boolean;

  @ManyToOne(() => Cart, (cart) => cart.cartProducts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })       // 👈 FIX HERE
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.cartProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })    // 👈 FIX HERE
  product: Product;
}
