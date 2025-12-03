import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dtos/create-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';
import { AddAiItemsBody } from './dtos/add-ai-item.dto';
import { SuggestPriceDto, UpdatePriceDto } from './dtos/price-suggestion.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
 @Post()
  create(@Body() createCartDto: CreateCartDto) {
    // createCartDto bây giờ đã có userId do frontend gửi lên
    return this.cartService.createCart(createCartDto);
  }
  @Get()
  findAll(@Query('userId') userId: number) {
    if (!userId) {
       // Tùy bạn xử lý: return [] hoặc throw lỗi nếu không có user
       return []; 
    }
    return this.cartService.getAllCart(userId);
  }
  @Get(':id')
  async getCartById(@Param('id') id: number) {
    return await this.cartService.getCartById(id);
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
  @Delete(':cartId/items/:productId')
  async removeItemFromCart(
    @Param('cartId') cartId: number,
    @Param('productId') productId: number,
  ) {
    return await this.cartService.removeItemFromCart(cartId, productId);
  }
  @Delete(':cartId/clear')
  async clearCart(@Param('cartId') cartId: number) {
    return await this.cartService.removeAllItemsFromCart(cartId);
  }
  @Post('suggest-price')
  @HttpCode(HttpStatus.OK)
  async suggestPrice(@Body() dto: SuggestPriceDto) {
    // Gọi hàm logic "Luôn hỏi AI" mà chúng ta vừa viết ở Service
    return this.cartService.suggestPrice(dto);
  }
  @Post('update-price')
  @HttpCode(HttpStatus.OK)
  async updatePrice(@Body() dto: UpdatePriceDto) {
    // Gọi hàm update đơn giản
    return this.cartService.updatePrice(dto);
  }
  // URL: PATCH /cart/toggle-status
  @Patch('toggle-status')
  async toggleStatus(@Body() body: { cartId: number; productId: number }) {
    return this.cartService.toggleItemStatus(body.cartId, body.productId);
  }
  @Patch(':id')
  async updateCart(@Param('id') id: number, @Body() dto: UpdateCartDto) {
    return await this.cartService.updateCartById(id, dto);
  }
}
