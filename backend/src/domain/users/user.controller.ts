import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Controller('auth')
export class UserController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ĐĂNG KÝ
  @Post('register')
  async register(@Body() body: any) {
    // Tạo user mới, lưu pass thô
    const newUser = this.userRepo.create({ 
      email: body.email, 
      password: body.password 
    });
    return this.userRepo.save(newUser);
  }

  // ĐĂNG NHẬP
  @Post('login')
  async login(@Body() body: any) {
    // Tìm user theo email và pass
    const user = await this.userRepo.findOne({ 
      where: { email: body.email, password: body.password } 
    });

    if (!user) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }

    // Trả về ID của user để frontend dùng
    return { 
      message: 'Login thành công', 
      user_id: user.id, 
      email: user.email 
    };
  }
}