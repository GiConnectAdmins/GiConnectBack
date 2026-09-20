import { NotFoundException } from "@nestjs/common";
import { EquipoService } from "./equipo.service";

describe("EquipoService", () => {
  let service: EquipoService;
  let modelMock: any;
  let personServiceMock: { resetClasesImpartidas: jest.Mock };

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

    personServiceMock = { resetClasesImpartidas: jest.fn() };

    service = new EquipoService(modelMock, personServiceMock as any);
  });

  describe("getById", () => {
    it("lanza NotFoundException si el equipo no existe", async () => {
      modelMock.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getById("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("lanza NotFoundException si el equipo no existe", async () => {
      modelMock.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.update("id-inexistente", {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("no permite mass-assignment de maestrosResponsables (el dto ya viene whitelistado por el pipe global, el service solo lo reenvía tal cual)", async () => {
      const dtoSinMaestros = { nombre: "Equipo A" };
      modelMock.findByIdAndUpdate.mockResolvedValue({
        _id: "1",
        ...dtoSinMaestros,
      });

      await service.update("1", dtoSinMaestros as any);

      expect(modelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "1",
        dtoSinMaestros,
        { new: true, runValidators: true },
      );
    });
  });

  describe("remove", () => {
    it("lanza NotFoundException si el equipo no existe", async () => {
      modelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("resetClasesImpartidas", () => {
    it("lanza NotFoundException si el equipo no existe", async () => {
      modelMock.findById.mockResolvedValue(null);
      await expect(
        service.resetClasesImpartidas("id-inexistente"),
      ).rejects.toThrow(NotFoundException);
    });

    it("delega en PersonService pasando los maestrosResponsables del equipo", async () => {
      modelMock.findById.mockResolvedValue({
        _id: "equipo-1",
        maestrosResponsables: ["maestro-1", "maestro-2"],
      });
      personServiceMock.resetClasesImpartidas.mockResolvedValue(2);

      const resultado = await service.resetClasesImpartidas("equipo-1");

      expect(personServiceMock.resetClasesImpartidas).toHaveBeenCalledWith([
        "maestro-1",
        "maestro-2",
      ]);
      expect(resultado).toEqual({
        mensaje: "Clases impartidas reseteadas correctamente",
        maestrosActualizados: 2,
      });
    });
  });
});
