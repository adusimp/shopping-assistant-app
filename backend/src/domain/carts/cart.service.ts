import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CreateCartDto } from './dtos/create-cart.dto';
import { UpdateCartDto } from './dtos/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}

  async createCart(data: CreateCartDto): Promise<Cart> {
    try {
      const cart = this.cartRepository.create({
        name: data.name,
        notify_at: data.notify_at,
      });
      return this.cartRepository.save(cart);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async getAllCart() {
    try {
      const cart_list = await this.cartRepository.find();
      return cart_list;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  async getCartById(id: number) {
    try {
      const cart = await this.cartRepository.findOne({ where: { id: id } });
      if (!cart) {
        throw new NotFoundException('cart not found');
      }
      return cart;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateCartById(id: number, dto: UpdateCartDto) {
    try {
      const cart = await this.cartRepository.findOne({ where: { id } });

      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      // Update fields if provided
      if (dto.name !== undefined) {
        cart.name = dto.name;
      }

      if (dto.notify_at !== undefined) {
        cart.notify_at = dto.notify_at;
      }

      return this.cartRepository.save(cart);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
