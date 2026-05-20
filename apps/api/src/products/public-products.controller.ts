import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/rbac.js";
import { ProductsService } from "./products.service.js";

@Public()
@ApiTags("public")
@Controller("public/products")
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll() {
    return this.products.findPublic();
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.products.findPublicBySlug(slug);
  }
}
