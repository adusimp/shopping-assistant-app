import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cart } from "./entities/cart.entity";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";

@Module({
    imports:[TypeOrmModule.forFeature([Cart])],
    providers:[CartService],
    controllers:[CartController],
})
export class CartModule{}
