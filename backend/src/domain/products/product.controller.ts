import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProductService } from './product.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CreateProductDto } from './dtos/create-product.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  // lấy sản phẩm trong giỏ hàng
  @Get('product-in-cart/:id')
  getProducts(@Param('id') id: number) {
    return this.productService.getProductsInCart(id);
  }

  // === 1. Tạo sản phẩm mới ===
  @Post()
  createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  // === 2. Thêm sản phẩm vào giỏ ===
  @Post('add-to-cart')
  addToCart(@Body() dto: AddToCartDto) {
    return this.productService.addToCart(dto);
  }
}
