import { ProductCategory } from 'src/common/enum/product-categories.enum';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CartProduct } from './cart-product.entity';


@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2,default:0 })
  price: number;

  @Column({nullable:true})
  img_url: string;

  @Column({
    type: 'enum',
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  category: ProductCategory;

  // One product -> many cart-product records
  @OneToMany(() => CartProduct, (cp) => cp.product)
  cartProducts: CartProduct[];
}
