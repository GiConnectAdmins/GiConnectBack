import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BeltDateService } from "./belt-date.service";

describe("BeltDateService", () => {
  let service: BeltDateService;
  let beltDateModelMock: any;
  let cinturonModelMock: any;

  beforeEach(() => {
    beltDateModelMock = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    }));
    beltDateModelMock.findById = jest.fn();
    beltDateModelMock.findByIdAndUpdate = jest.fn();
    beltDateModelMock.findByIdAndDelete = jest.fn();

    cinturonModelMock = { findById: jest.fn() };

    service = new BeltDateService(beltDateModelMock, cinturonModelMock);
  });

  describe("create", () => {
    it("rechaza si el cinturón no existe", async () => {
      cinturonModelMock.findById.mockResolvedValue(null);
      await expect(
        service.create({ cinturon: "id-inexistente" } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza una fecha de concesión futura", async () => {
      cinturonModelMock.findById.mockResolvedValue({ _id: "cinturon-1" });
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);

      await expect(
        service.create({
          cinturon: "cinturon-1",
          fecha: manana.toISOString(),
        } as any),
      ).rejects.toThrow("No se puede registrar una fecha de concesión futura");
    });

    it("acepta la fecha de hoy exacta (comparación solo por día)", async () => {
      cinturonModelMock.findById.mockResolvedValue({ _id: "cinturon-1" });
      const hoyConHora = new Date();
      hoyConHora.setHours(23, 59, 0, 0);

      const resultado: any = await service.create({
        cinturon: "cinturon-1",
        fecha: hoyConHora.toISOString(),
      } as any);

      expect(resultado.cinturon).toBe("cinturon-1");
    });

    it("usa la fecha actual si no se proporciona fecha", async () => {
      cinturonModelMock.findById.mockResolvedValue({ _id: "cinturon-1" });
      const resultado: any = await service.create({
        cinturon: "cinturon-1",
      } as any);
      expect(resultado.fecha).toBeInstanceOf(Date);
    });
  });

  describe("update", () => {
    it("rechaza update sin ningún campo (ni cinturon ni fecha)", async () => {
      await expect(service.update("1", {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rechaza si el nuevo cinturón no existe", async () => {
      cinturonModelMock.findById.mockResolvedValue(null);
      await expect(
        service.update("1", { cinturon: "id-inexistente" } as any),
      ).rejects.toThrow("El cinturón especificado no existe");
    });

    it("rechaza fecha futura también en update (comparación exacta con hora, réplica del bug original)", async () => {
      const manana = new Date();
      manana.setMinutes(manana.getMinutes() + 5);

      await expect(
        service.update("1", { fecha: manana.toISOString() } as any),
      ).rejects.toThrow("No se puede registrar una fecha de concesión futura");
    });

    it("lanza NotFoundException si el registro no existe", async () => {
      beltDateModelMock.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update("id-inexistente", { fecha: "2020-01-01" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("lanza NotFoundException si no existe", async () => {
      beltDateModelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove("id-inexistente")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
