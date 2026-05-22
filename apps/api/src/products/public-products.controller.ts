import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/rbac.js";
import { ProductDto } from "./products.openapi.js";
import { ProductsService } from "./products.service.js";

@Public()
@ApiTags("public")
@Controller("public/products")
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOkResponse({ type: [ProductDto] })
  findAll() {
    return this.products.findPublic();
  }

  @Get(":slug")
  @ApiOkResponse({ type: ProductDto })
  findOne(@Param("slug") slug: string) {
    return this.products.findPublicBySlug(slug);
  }
}
