import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PersonService } from "./person.service";

describe("PersonService", () => {
  let service: PersonService;
  let personModelMock: any;
  let equipoModelMock: any;

  const populateChain = (resolvedValue: unknown) => {
    const chain: any = {};
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve);
    return chain;
  };

  beforeEach(() => {
    personModelMock = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      updateMany: jest.fn(),
    };
    equipoModelMock = { findOne: jest.fn() };

    service = new PersonService(personModelMock, equipoModelMock);
  });

  describe("getById — reglas de visibilidad", () => {
    it("lanza NotFoundException si la persona no existe", async () => {
      personModelMock.findById.mockReturnValue(populateChain(null));

      await expect(
        service.getById("id-inexistente", { rol: "Admin" } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("Admin puede ver a cualquiera", async () => {
      const persona = { _id: "persona-1" };
      personModelMock.findById.mockReturnValue(populateChain(persona));

      const resultado = await service.getById("persona-1", {
        rol: "Admin",
        _id: "admin-1",
      } as any);
      expect(resultado).toBe(persona);
    });

    it("cualquiera puede verse a sí mismo", async () => {
      const persona = { _id: { toString: () => "atleta-1" } };
      personModelMock.findById.mockReturnValue(populateChain(persona));

      const resultado = await service.getById("atleta-1", {
        rol: "Atleta",
        _id: { toString: () => "atleta-1" },
        equipo: "equipo-x",
      } as any);
      expect(resultado).toBe(persona);
    });

    it("Atleta sin equipo compartido recibe ForbiddenException", async () => {
      const persona = {
        _id: { toString: () => "otro-atleta" },
        equipo: { _id: "equipo-B" },
      };
      personModelMock.findById.mockReturnValue(populateChain(persona));

      await expect(
        service.getById("otro-atleta", {
          rol: "Atleta",
          _id: { toString: () => "yo" },
          equipo: "equipo-A",
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Atleta con el mismo equipo puede ver al compañero", async () => {
      const persona = {
        _id: { toString: () => "companero" },
        equipo: { _id: "equipo-A" },
      };
      personModelMock.findById.mockReturnValue(populateChain(persona));

      const resultado = await service.getById("companero", {
        rol: "Atleta",
        _id: { toString: () => "yo" },
        equipo: "equipo-A",
      } as any);
      expect(resultado).toBe(persona);
    });

    it("Maestro sin equipo en común recibe ForbiddenException", async () => {
      const persona = {
        _id: { toString: () => "atleta-1" },
        equipo: "equipo-B",
      };
      personModelMock.findById.mockReturnValue(populateChain(persona));
      equipoModelMock.findOne.mockResolvedValue(null);

      await expect(
        service.getById("atleta-1", {
          rol: "Maestro",
          _id: { toString: () => "maestro-1" },
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Maestro responsable del equipo del atleta puede verlo", async () => {
      const persona = {
        _id: { toString: () => "atleta-1" },
        equipo: "equipo-B",
      };
      personModelMock.findById.mockReturnValue(populateChain(persona));
      equipoModelMock.findOne.mockResolvedValue({ _id: "equipo-B" });

      const resultado = await service.getById("atleta-1", {
        rol: "Maestro",
        _id: { toString: () => "maestro-1" },
      } as any);
      expect(resultado).toBe(persona);
    });
  });

  describe("updateMe", () => {
    it("lanza BadRequestException si no hay campos válidos (todo undefined)", async () => {
      await expect(
        service.updateMe("user-1", { nombre: undefined } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("filtra los undefined antes de actualizar", async () => {
      personModelMock.findByIdAndUpdate.mockReturnValue(
        populateChain({ nombre: "Nuevo" }),
      );

      await service.updateMe("user-1", {
        nombre: "Nuevo",
        apellidos: undefined,
      } as any);

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        { nombre: "Nuevo" },
        { new: true, runValidators: true },
      );
    });
  });

  describe("cambiarPassword", () => {
    it("lanza NotFoundException si el usuario no existe", async () => {
      personModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.cambiarPassword("id-inexistente", {
          passwordActual: "x",
          passwordNuevo: "y",
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("lanza UnauthorizedException si el password actual es incorrecto", async () => {
      const personaMock = {
        compararPassword: jest.fn().mockResolvedValue(false),
      };
      personModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(personaMock),
      });

      await expect(
        service.cambiarPassword("user-1", {
          passwordActual: "mal",
          passwordNuevo: "y",
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("actualiza el password y lo guarda (el hash lo hace el pre-save del schema)", async () => {
      const personaMock: any = {
        compararPassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(undefined),
        password: "hash-viejo",
      };
      personModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(personaMock),
      });

      const resultado = await service.cambiarPassword("user-1", {
        passwordActual: "correcto",
        passwordNuevo: "nuevoPassword",
      } as any);

      expect(personaMock.password).toBe("nuevoPassword");
      expect(personaMock.save).toHaveBeenCalled();
      expect(resultado).toEqual({
        mensaje: "Password actualizado correctamente",
      });
    });
  });

  describe("updateById — permisos por rol", () => {
    it("Atleta nunca puede usar este endpoint", async () => {
      await expect(
        service.updateById("1", {} as any, { rol: "Atleta" } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lanza NotFoundException si la persona a editar no existe", async () => {
      personModelMock.findById.mockResolvedValue(null);
      await expect(
        service.updateById(
          "id-inexistente",
          {} as any,
          { rol: "Admin" } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("Maestro sin ser responsable del equipo del atleta recibe ForbiddenException", async () => {
      personModelMock.findById.mockResolvedValue({
        _id: "atleta-1",
        equipo: "equipo-B",
      });
      equipoModelMock.findOne.mockResolvedValue(null);

      await expect(
        service.updateById(
          "atleta-1",
          { suscripcion: "activa" } as any,
          { rol: "Maestro", _id: "maestro-1" } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Maestro responsable solo puede tocar los campos permitidos (suscripcion)", async () => {
      personModelMock.findById.mockResolvedValue({
        _id: "atleta-1",
        equipo: "equipo-B",
      });
      equipoModelMock.findOne.mockResolvedValue({ _id: "equipo-B" });
      personModelMock.findByIdAndUpdate.mockReturnValue(
        populateChain({ suscripcion: "activa" }),
      );

      await service.updateById(
        "atleta-1",
        { suscripcion: "activa", nombre: "Intento de cambiar nombre" } as any,
        { rol: "Maestro", _id: "maestro-1" } as any,
      );

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "atleta-1",
        { suscripcion: "activa" },
        { new: true, runValidators: true },
      );
    });

    it("Maestro no puede asignar equipo (solo quitarlo con null)", async () => {
      personModelMock.findById.mockResolvedValue({
        _id: "atleta-1",
        equipo: "equipo-B",
      });
      equipoModelMock.findOne.mockResolvedValue({ _id: "equipo-B" });

      await expect(
        service.updateById(
          "atleta-1",
          { equipo: "otro-equipo" } as any,
          { rol: "Maestro", _id: "maestro-1" } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("Maestro puede expulsar a un atleta poniendo equipo: null", async () => {
      personModelMock.findById.mockResolvedValue({
        _id: "atleta-1",
        equipo: "equipo-B",
      });
      equipoModelMock.findOne.mockResolvedValue({ _id: "equipo-B" });
      personModelMock.findByIdAndUpdate.mockReturnValue(
        populateChain({ equipo: null }),
      );

      await service.updateById(
        "atleta-1",
        { equipo: null } as any,
        { rol: "Maestro", _id: "maestro-1" } as any,
      );

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "atleta-1",
        { equipo: null },
        { new: true, runValidators: true },
      );
    });

    it("Admin puede actualizar cualquier campo whitelisteado por el DTO", async () => {
      personModelMock.findById.mockResolvedValue({ _id: "persona-1" });
      personModelMock.findByIdAndUpdate.mockReturnValue(
        populateChain({ nombre: "Nuevo" }),
      );

      await service.updateById(
        "persona-1",
        { nombre: "Nuevo" } as any,
        { rol: "Admin" } as any,
      );

      expect(personModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        "persona-1",
        { nombre: "Nuevo" },
        { new: true, runValidators: true },
      );
    });
  });

  describe("remove", () => {
    it("impide que un usuario se elimine a sí mismo", async () => {
      await expect(service.remove("user-1", "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lanza NotFoundException si la persona no existe", async () => {
      personModelMock.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.remove("id-inexistente", "admin-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("resetClasesImpartidas", () => {
    it("devuelve el número de documentos modificados", async () => {
      personModelMock.updateMany.mockResolvedValue({ modifiedCount: 3 });
      const resultado = await service.resetClasesImpartidas(["a", "b", "c"]);
      expect(resultado).toBe(3);
      expect(personModelMock.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["a", "b", "c"] } },
        { clasesImpartidas: 0 },
      );
    });
  });
});
