import { PartialType } from '@nestjs/mapped-types';
import { CreateBeltDateDto } from './create-belt-date.dto';

export class UpdateBeltDateDto extends PartialType(CreateBeltDateDto) {}
