import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ClaseService } from "./clase.service";

describe("ClaseService", () => {
  let service: ClaseService;
  let modelMock: any;

  beforeEach(() => {
    modelMock = jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    }));
    modelMock.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis() }),
    });
    modelMock.findById = jest.fn();
    modelMock.findByIdAndUpdate = jest.fn();
    modelMock.findByIdAndDelete = jest.fn();

    service = new ClaseService(modelMock);
  });

  describe("getAll — filtros combinables", () => {
    it("no añade filtros si el query viene vacío", () => {
      service.getAll({} as any);
      expect(modelMock.find).toHaveBeenCalledWith({});
    });

    it("añade filtro de maestro y tipo tal cual, y titulo como regex case-insensitive", () => {
      service.getAll({
        maestro: "maestro-1",
        tipo: "recurrente",
        titulo: "Kids",
      } as any);
      expect(modelMock.find).toHaveBeenCalledWith({
        maestro: "maestro-1",
        tipo: "recurrente",
        titulo: { $regex: "Kids", $options: "i" },
      });
    });
  });

  describe("getById", () => {
    it("lanza NotFoundException si no existe", async () => {
      modelMock.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getById("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create — validarCoherencia", () => {
    it("rechaza clase recurrente sin diaSemana", async () => {
      await expect(
        service.create({ tipo: "recurrente" } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza clase recurrente que además trae fecha", async () => {
      await expect(
        service.create({
          tipo: "recurrente",
          diaSemana: "Lunes",
          fecha: "2026-01-01",
        } as any),
      ).rejects.toThrow('Una clase recurrente no debe tener el campo "fecha"');
    });

    it("rechaza clase especial sin fecha", async () => {
      await expect(service.create({ tipo: "especial" } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rechaza clase especial que además trae diaSemana", async () => {
      await expect(
        service.create({
          tipo: "especial",
          fecha: "2026-01-01",
          diaSemana: "Lunes",
        } as any),
      ).rejects.toThrow(
        'Una clase especial no debe tener el campo "diaSemana"',
      );
    });

    it("crea una clase recurrente válida limpiando el campo fecha", async () => {
      await service.create({
        tipo: "recurrente",
        diaSemana: "Lunes",
        titulo: "Kids",
      } as any);
      expect(modelMock).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "recurrente", fecha: undefined }),
      );
    });
  });

  describe("update — coherencia con estado previo en DB", () => {
    it("lanza NotFoundException si la clase no existe", async () => {
      modelMock.findById.mockResolvedValue(null);
      await expect(service.update("id-inexistente", {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rechaza pasar a especial sin fecha (ni en dto ni ya en DB)", async () => {
      modelMock.findById.mockResolvedValue({
        tipo: "recurrente",
        diaSemana: "Lunes",
        fecha: undefined,
      });
      await expect(
        service.update("1", { tipo: "especial" } as any),
      ).rejects.toThrow('Una clase especial debe tener el campo "fecha"');
    });

    it("permite actualizar solo el titulo manteniendo el tipo/fecha existentes", async () => {
      modelMock.findById.mockResolvedValue({
        tipo: "especial",
        fecha: "2026-01-01",
        diaSemana: undefined,
      });
      modelMock.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ titulo: "Nuevo título" }),
      });

      const resultado = await service.update("1", {
        titulo: "Nuevo título",
      } as any);
      expect(resultado).toEqual({ titulo: "Nuevo título" });
    });
  });

  describe("remove", () => {
    it("lanza NotFoundException si no existe", async () => {
      modelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
