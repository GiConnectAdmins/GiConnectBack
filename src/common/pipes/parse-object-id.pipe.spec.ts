import { BadRequestException } from "@nestjs/common";
import { ParseObjectIdPipe } from "./parse-object-id.pipe";

describe("ParseObjectIdPipe", () => {
  const pipe = new ParseObjectIdPipe();

  it("deja pasar un ObjectId válido de 24 caracteres hexadecimales", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(pipe.transform(id)).toBe(id);
  });

  it("rechaza un id con formato inválido", () => {
    expect(() => pipe.transform("no-es-un-objectid")).toThrow(
      BadRequestException,
    );
  });

  it("rechaza cadena vacía", () => {
    expect(() => pipe.transform("")).toThrow(BadRequestException);
  });
});
