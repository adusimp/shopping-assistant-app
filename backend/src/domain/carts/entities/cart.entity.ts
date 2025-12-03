import { CartProduct } from 'src/domain/products/entities/cart-product.entity';
import { User } from 'src/domain/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne } from 'typeorm';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  budget: number;

  @Column({ type: 'datetime', nullable: true })
  notify_at: Date;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // One cart -> many cart-product records
  @OneToMany(() => CartProduct, (cp) => cp.cart)
  cartProducts: CartProduct[];

  @Column()
  user_id: number; // Lưu ID người tạo

  @ManyToOne(() => User, (user) => user.carts)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
