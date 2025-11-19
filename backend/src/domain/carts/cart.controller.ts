import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dtos/create-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
  @Post()
  async createCart(@Body() data: CreateCartDto) {
    return await this.cartService.createCart(data);
  }
  @Get()
  async getAllCart() {
    return await this.cartService.getAllCart();
  }
  @Get(':id')
  async getCartById(@Param('id') id: number) {
    return await this.cartService.getCartById(id);
  }
  @Patch(':id')
  updateCart(@Param('id') id: number, @Body() dto: UpdateCartDto) {
    return this.cartService.updateCartById(id, dto);
  }
}
