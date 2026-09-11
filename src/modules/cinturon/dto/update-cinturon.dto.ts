import { PartialType } from "@nestjs/mapped-types";
import { CreateCinturonDto } from "./create-cinturon.dto";

export class UpdateCinturonDto extends PartialType(CreateCinturonDto) {}
