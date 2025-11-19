import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CartProduct } from './entities/cart-product.entity';
import { Cart } from '../carts/entities/cart.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Cart, CartProduct]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
