import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MaestroResponsableGuard } from "./maestro-responsable.guard";

describe("MaestroResponsableGuard", () => {
  let guard: MaestroResponsableGuard;
  let equipoModelMock: { findById: jest.Mock };

  const buildContext = (user: unknown, params: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    }) as any;

  beforeEach(() => {
    equipoModelMock = { findById: jest.fn() };
    guard = new MaestroResponsableGuard(equipoModelMock as any);
  });

  it("Admin pasa siempre sin consultar el equipo", async () => {
    const resultado = await guard.canActivate(
      buildContext({ rol: "Admin" }, { id: "equipo-1" }),
    );
    expect(resultado).toBe(true);
    expect(equipoModelMock.findById).not.toHaveBeenCalled();
  });

  it("lanza NotFoundException si el equipo no existe", async () => {
    equipoModelMock.findById.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        buildContext(
          { rol: "Maestro", _id: "maestro-1" },
          { id: "id-inexistente" },
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("lanza ForbiddenException si el Maestro no está en maestrosResponsables", async () => {
    equipoModelMock.findById.mockResolvedValue({
      maestrosResponsables: [{ toString: () => "otro-maestro" }],
    });
    await expect(
      guard.canActivate(
        buildContext(
          { rol: "Maestro", _id: { toString: () => "maestro-1" } },
          { id: "equipo-1" },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("deja pasar si el Maestro figura en maestrosResponsables del equipo", async () => {
    equipoModelMock.findById.mockResolvedValue({
      maestrosResponsables: [{ toString: () => "maestro-1" }],
    });
    const resultado = await guard.canActivate(
      buildContext(
        { rol: "Maestro", _id: { toString: () => "maestro-1" } },
        { id: "equipo-1" },
      ),
    );
    expect(resultado).toBe(true);
  });
});
