import { IsIn, IsNotEmpty } from "class-validator";
import { COLORS } from "../schemas/cinturon.schema";

export class CreateCinturonDto {
  @IsNotEmpty({ message: "El color es obligatorio" })
  @IsIn(COLORS, {
    message: `Color inválido. Valores permitidos: ${COLORS.join(", ")}`,
  })
  color: string;

  @IsNotEmpty({ message: "El grado es obligatorio" })
  @IsIn([0, 1, 2, 3, 4], { message: "El grado debe ser un número entre 0 y 4" })
  grado: number;
}
