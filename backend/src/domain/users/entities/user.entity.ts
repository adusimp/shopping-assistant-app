import { Cart } from 'src/domain/carts/entities/cart.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string; // Lưu pass thô cho đơn giản (theo yêu cầu của bạn)

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];
}