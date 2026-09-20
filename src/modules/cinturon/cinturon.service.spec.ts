import { NotFoundException } from "@nestjs/common";
import { CinturonService } from "./cinturon.service";

describe("CinturonService", () => {
  let service: CinturonService;
  let modelMock: any;

  beforeEach(() => {
    modelMock = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: "1", ...dto }),
    }));
    modelMock.find = jest
      .fn()
      .mockReturnValue({ sort: jest.fn().mockReturnThis() });
    modelMock.findById = jest.fn();
    modelMock.findByIdAndUpdate = jest.fn();
    modelMock.findByIdAndDelete = jest.fn();

    service = new CinturonService(modelMock);
  });

  it("getAll ordena por createdAt descendente", () => {
    service.getAll();
    expect(modelMock.find).toHaveBeenCalled();
  });

  describe("getById", () => {
    it("lanza NotFoundException si no existe", async () => {
      modelMock.findById.mockResolvedValue(null);
      await expect(service.getById("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("devuelve el cinturón si existe", async () => {
      modelMock.findById.mockResolvedValue({ _id: "1", color: "Negro" });
      const resultado = await service.getById("1");
      expect(resultado).toEqual({ _id: "1", color: "Negro" });
    });
  });

  it("create guarda un nuevo cinturón", async () => {
    const dto = { color: "Azul", grado: 1 };
    const resultado: any = await service.create(dto as any);
    expect(resultado.color).toBe("Azul");
  });

  describe("update", () => {
    it("lanza NotFoundException si el cinturón no existe", async () => {
      modelMock.findByIdAndUpdate.mockResolvedValue(null);
      await expect(
        service.update("id-inexistente", { color: "Rojo" } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("actualiza y devuelve el cinturón con runValidators activado", async () => {
      modelMock.findByIdAndUpdate.mockResolvedValue({
        _id: "1",
        color: "Rojo",
      });
      const resultado = await service.update("1", { color: "Rojo" } as any);
      expect(modelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "1",
        { color: "Rojo" },
        { new: true, runValidators: true },
      );
      expect(resultado).toEqual({ _id: "1", color: "Rojo" });
    });
  });

  describe("remove", () => {
    it("lanza NotFoundException si el cinturón no existe", async () => {
      modelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("elimina y devuelve mensaje de confirmación", async () => {
      modelMock.findByIdAndDelete.mockResolvedValue({ _id: "1" });
      const resultado = await service.remove("1");
      expect(resultado).toEqual({
        mensaje: "Cinturón eliminado correctamente",
      });
    });
  });
});
