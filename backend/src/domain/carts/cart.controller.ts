import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dtos/create-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { AddAiItemsBody } from './dtos/add-ai-item.dto';

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
  async updateCart(@Param('id') id: number, @Body() dto: UpdateCartDto) {
    return await this.cartService.updateCartById(id, dto);
  }
  @Delete(':id')
  async deleteCart(@Param('id') id: number) {
    return await this.cartService.deleteCart(id);
  }
  @Post('suggest')
  async getSuggestion(@Body('cartName') cartName: string) {
    return this.cartService.suggestProducts(cartName);
  }
  @Post('add-ai-items')
  async addAiItems(@Body() body: AddAiItemsBody) {
    return this.cartService.addAiItemsToCart(body);
  }
}
