import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("debe devolver el mensaje de estado de la API", () => {
      expect(appController.getStatus()).toEqual({
        message: "API de GiConnect funcionando ✅",
        version: "1.0.0",
      });
    });
  });
});
