import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let personService: {
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    create: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    personService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue("token-firmado") };

    authService = new AuthService(personService as any, jwtService as any);
  });

  describe("register", () => {
    const dto = {
      nombre: "Daniel",
      apellidos: "Perez",
      telefono: "600000000",
      email: "daniel@test.com",
      password: "Secreto123",
    };

    it("lanza BadRequestException si el email ya existe", async () => {
      personService.findByEmail.mockResolvedValue({ _id: "1" });

      await expect(authService.register(dto as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(personService.create).not.toHaveBeenCalled();
    });

    it("crea el usuario, firma el token y nunca devuelve el password", async () => {
      personService.findByEmail.mockResolvedValue(null);
      personService.create.mockResolvedValue({
        _id: "abc123",
        nombre: "Daniel",
        apellidos: "Perez",
        email: "daniel@test.com",
        rol: "Atleta",
        password: "hash-secreto",
      });

      const resultado = await authService.register(dto as any);

      expect(personService.create).toHaveBeenCalledWith(dto);
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: "abc123",
        email: "daniel@test.com",
        rol: "Atleta",
      });
      expect(resultado.token).toBe("token-firmado");
      expect(resultado.usuario).not.toHaveProperty("password");
      expect(resultado.usuario).toEqual({
        id: "abc123",
        nombre: "Daniel",
        apellidos: "Perez",
        email: "daniel@test.com",
        rol: "Atleta",
      });
    });
  });

  describe("login", () => {
    const dto = { email: "daniel@test.com", password: "Secreto123" };

    it("lanza UnauthorizedException si el email no existe", async () => {
      personService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("lanza UnauthorizedException si el password es incorrecto, con el mismo mensaje que email inexistente", async () => {
      const usuarioMock = {
        compararPassword: jest.fn().mockResolvedValue(false),
      };
      personService.findByEmailWithPassword.mockResolvedValue(usuarioMock);

      await expect(authService.login(dto)).rejects.toThrow(
        "Credenciales inválidas",
      );
    });

    it("devuelve token y usuario público si las credenciales son correctas", async () => {
      const usuarioMock = {
        _id: "abc123",
        nombre: "Daniel",
        apellidos: "Perez",
        email: "daniel@test.com",
        rol: "Atleta",
        password: "hash-secreto",
        compararPassword: jest.fn().mockResolvedValue(true),
      };
      personService.findByEmailWithPassword.mockResolvedValue(usuarioMock);

      const resultado = await authService.login(dto);

      expect(usuarioMock.compararPassword).toHaveBeenCalledWith("Secreto123");
      expect(resultado.mensaje).toBe("Login exitoso");
      expect(resultado.usuario).not.toHaveProperty("password");
    });
  });
});
