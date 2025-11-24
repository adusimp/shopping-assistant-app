import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   const config = new DocumentBuilder()
    .setTitle('API Docs')
    .setDescription('Swagger API documentation')
    .setVersion('1.0')
    .addBearerAuth() // nếu muốn dùng JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.enableCors({
    origin: '*',            // Cho phép tất cả origin
    methods: 'GET,POST,PUT,PATCH,DELETE',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
