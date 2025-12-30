import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@corely/data";
import { PlatformModule } from "../platform.module";
import { MenuController } from "../adapters/http/menu.controller";

describe("PlatformModule DI wiring", () => {
  let moduleRef: TestingModule;
  let menuController: MenuController;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PlatformModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    menuController = moduleRef.get<MenuController>(MenuController);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("resolves MenuController with its DI graph", () => {
    expect(menuController).toBeDefined();
  });
});
