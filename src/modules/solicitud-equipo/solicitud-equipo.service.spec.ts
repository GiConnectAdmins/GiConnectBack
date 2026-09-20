import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SolicitudEquipoService } from "./solicitud-equipo.service";

describe("SolicitudEquipoService", () => {
  let service: SolicitudEquipoService;
  let solicitudModelMock: any;
  let personModelMock: any;
  let equipoModelMock: any;

  beforeEach(() => {
    solicitudModelMock = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    }));
    solicitudModelMock.findOne = jest.fn();
    solicitudModelMock.findById = jest.fn();
    solicitudModelMock.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnThis() }),
    });

    personModelMock = { findByIdAndUpdate: jest.fn() };
    equipoModelMock = { findById: jest.fn(), findOne: jest.fn() };

    service = new SolicitudEquipoService(
      solicitudModelMock,
      personModelMock,
      equipoModelMock,
    );
  });

  describe("create", () => {
    const dto = { equipo: "equipo-1", tipo: "equipo", mensaje: "hola" };

    it("rechaza una solicitud duplicada pendiente", async () => {
      solicitudModelMock.findOne.mockResolvedValue({ _id: "existente" });

      await expect(service.create("atleta-1", dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(equipoModelMock.findById).not.toHaveBeenCalled();
    });

    it("rechaza si el equipo no existe", async () => {
      solicitudModelMock.findOne.mockResolvedValue(null);
      equipoModelMock.findById.mockResolvedValue(null);

      await expect(service.create("atleta-1", dto as any)).rejects.toThrow(
        "El equipo no existe",
      );
    });

    it("rechaza equipos de referencia/publicidad sin maestrosResponsables", async () => {
      solicitudModelMock.findOne.mockResolvedValue(null);
      equipoModelMock.findById.mockResolvedValue({ maestrosResponsables: [] });

      await expect(service.create("atleta-1", dto as any)).rejects.toThrow(
        "Este equipo no acepta solicitudes",
      );
    });

    it("crea la solicitud si pasa todas las validaciones", async () => {
      solicitudModelMock.findOne.mockResolvedValue(null);
      equipoModelMock.findById.mockResolvedValue({
        maestrosResponsables: ["maestro-1"],
      });

      const resultado: any = await service.create("atleta-1", dto as any);
      expect(resultado.atleta).toBe("atleta-1");
      expect(resultado.tipo).toBe("equipo");
    });
  });

  describe("getPendientesPorEquipo", () => {
    it("lanza NotFoundException si el equipo no existe", async () => {
      equipoModelMock.findById.mockResolvedValue(null);
      await expect(
        service.getPendientesPorEquipo("id-inexistente", {
          rol: "Admin",
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("Maestro que no es responsable del equipo recibe ForbiddenException", async () => {
      equipoModelMock.findById.mockResolvedValue({
        maestrosResponsables: [{ toString: () => "otro-maestro" }],
      });

      await expect(
        service.getPendientesPorEquipo("equipo-1", {
          rol: "Maestro",
          _id: { toString: () => "maestro-1" },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Maestro responsable puede listar las solicitudes pendientes", async () => {
      equipoModelMock.findById.mockResolvedValue({
        maestrosResponsables: [{ toString: () => "maestro-1" }],
      });

      await service.getPendientesPorEquipo("equipo-1", {
        rol: "Maestro",
        _id: { toString: () => "maestro-1" },
      } as any);

      expect(solicitudModelMock.find).toHaveBeenCalledWith({
        equipo: "equipo-1",
        estado: "pendiente",
      });
    });
  });

  describe("aceptar / rechazar — validaciones comunes vía obtenerSolicitudParaResponder", () => {
    it("lanza NotFoundException si la solicitud no existe", async () => {
      solicitudModelMock.findById.mockResolvedValue(null);
      await expect(
        service.aceptar("id-inexistente", { rol: "Admin" } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("rechaza responder una solicitud que ya no está pendiente", async () => {
      solicitudModelMock.findById.mockResolvedValue({ estado: "aceptada" });
      await expect(
        service.aceptar("1", { rol: "Admin" } as any, {} as any),
      ).rejects.toThrow("Esta solicitud ya fue aceptada");
    });

    it("Maestro no responsable del equipo de la solicitud recibe ForbiddenException", async () => {
      solicitudModelMock.findById.mockResolvedValue({
        estado: "pendiente",
        equipo: "equipo-1",
      });
      equipoModelMock.findOne.mockResolvedValue(null);

      await expect(
        service.aceptar(
          "1",
          { rol: "Maestro", _id: "maestro-1" } as any,
          {} as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("aceptar — efectos según tipo de solicitud", () => {
    const buildSolicitud = (tipo: "equipo" | "afiliacion") => ({
      estado: "pendiente",
      tipo,
      atleta: "atleta-1",
      equipo: "equipo-1",
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    });

    it('tipo "equipo": asigna el equipo principal del atleta', async () => {
      const solicitud = buildSolicitud("equipo");
      solicitudModelMock.findById.mockResolvedValue(solicitud);

      await service.aceptar("1", { rol: "Admin" } as any, {} as any);

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "atleta-1",
        { equipo: "equipo-1" },
      );
      expect(solicitud.estado).toBe("aceptada");
    });

    it('tipo "afiliacion": añade el equipo al array de afiliaciones con $addToSet', async () => {
      const solicitud = buildSolicitud("afiliacion");
      solicitudModelMock.findById.mockResolvedValue(solicitud);

      await service.aceptar("1", { rol: "Admin" } as any, {} as any);

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "atleta-1",
        { $addToSet: { afiliacion: "equipo-1" } },
      );
    });

    it("usa el mensaje por defecto si no se envía respuestaMaestro", async () => {
      const solicitud = buildSolicitud("equipo");
      solicitudModelMock.findById.mockResolvedValue(solicitud);

      await service.aceptar("1", { rol: "Admin" } as any, {} as any);

      expect(solicitud.respuestaMaestro).toBe("Solicitud aceptada");
    });
  });

  describe("rechazar", () => {
    it("no modifica el equipo del atleta", async () => {
      const solicitud = {
        estado: "pendiente",
        tipo: "equipo",
        atleta: "atleta-1",
        equipo: "equipo-1",
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      solicitudModelMock.findById.mockResolvedValue(solicitud);

      await service.rechazar("1", { rol: "Admin" } as any, {} as any);

      expect(solicitud.estado).toBe("rechazada");
      expect(personModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
