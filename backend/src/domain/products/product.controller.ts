import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AddProductToCartDto } from './dtos/add-product-to-cart.dto';
import { ProductCategory } from 'src/common/enum/product-categories.enum';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get('barcode/:code')
  async getByBarcode(@Param('code') code: string) {
    const product = await this.productService.findByBarcode(code);
    if (!product) {
        // Trả về status đặc biệt để Frontend biết là chưa có
        return { found: false, message: 'Chưa có dữ liệu sản phẩm này' };
    }
    return { found: true, product };
  }
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
  @Post('add-product-to-cart')
  @UseInterceptors(FileInterceptor('file'))
  addProductToCart(
    @Body() dto: AddProductToCartDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('Body nhận được:', dto);
    console.log('File nhận được:', file);
    return this.productService.addProductToCart(dto, file);
  }
  @Get()
  async getAllProducts(
    @Query('page') page: string,
    @Query('category') category?: ProductCategory,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;

    return this.productService.getAllProducts(pageNum, category);
  }
}
