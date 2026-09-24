import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorDto } from './dto.js';

export function ApiEndpoint(
  summary: string,
  type: Type<unknown>,
  status = 200,
  isArray = false,
  description = summary,
) {
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiResponse({ status, type, isArray, description: 'Successful response' }),
    ApiBadRequestResponse({
      type: ErrorDto,
      description: 'Invalid input or workflow transition',
    }),
    ApiUnauthorizedResponse({
      type: ErrorDto,
      description: 'Missing, expired or invalid bearer token; inactive user',
    }),
    ApiForbiddenResponse({
      type: ErrorDto,
      description: 'Role or ticket ownership does not permit this action',
    }),
    ApiNotFoundResponse({
      type: ErrorDto,
      description: 'Resource not found or not visible to this user',
    }),
    ApiConflictResponse({
      type: ErrorDto,
      description:
        'Duplicate resource or operation conflicts with current state',
    }),
  );
}
