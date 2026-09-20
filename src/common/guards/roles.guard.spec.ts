import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflectorMock: { getAllAndOverride: jest.Mock };

  const buildContext = (user: unknown) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(() => {
    reflectorMock = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflectorMock as any);
  });

  it("deja pasar si la ruta no tiene @Roles(...)", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(null))).toBe(true);
  });

  it("lanza UnauthorizedException si no hay usuario autenticado en request", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(["Admin"]);
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it("lanza ForbiddenException si el rol del usuario no está permitido", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(["Admin"]);
    expect(() => guard.canActivate(buildContext({ rol: "Atleta" }))).toThrow(
      ForbiddenException,
    );
  });

  it("deja pasar si el rol del usuario está entre los permitidos", () => {
    reflectorMock.getAllAndOverride.mockReturnValue(["Admin", "Maestro"]);
    expect(guard.canActivate(buildContext({ rol: "Maestro" }))).toBe(true);
  });
});
