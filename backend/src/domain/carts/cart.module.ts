import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cart } from "./entities/cart.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { Product } from "../products/entities/product.entity";
import { CartProduct } from "../products/entities/cart-product.entity";

@Module({
    imports:[TypeOrmModule.forFeature([Cart,Product,CartProduct])],
    providers:[CartService],
    controllers:[CartController],
})
export class CartModule{}
