import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';
import { incompleteRegistrantException } from '../../utils/registrant-completeness';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function run(exception: HttpException) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as unknown };
  }

  it('keeps the shape of a built-in exception, without Nest’s statusCode', () => {
    expect(run(new NotFoundException('Event not found'))).toEqual({
      status: 404,
      body: { message: 'Event not found', error: 'NotFoundException', status: 404 },
    });
  });

  it('keeps the shape of a string-bodied exception', () => {
    expect(run(new HttpException('Teapot', 418)).body).toEqual({
      message: 'Teapot',
      error: 'HttpException',
      status: 418,
    });
  });

  it('keeps the validation-error shape', () => {
    const err = new BadRequestException({ message: ['event_id must be an integer'] });
    expect(run(err).body).toEqual({
      message: 'Validation failed',
      errors: ['event_id must be an integer'],
      error: 'BadRequestException',
      status: 400,
    });
  });

  it('passes the incomplete-registrant code and missing fields through (SUP-1141)', () => {
    expect(run(incompleteRegistrantException(['last_name', 'address_line_1']))).toEqual({
      status: 422,
      body: {
        message: 'Registrant profile is incomplete',
        error: 'UnprocessableEntityException',
        status: 422,
        code: 'INCOMPLETE_REGISTRANT',
        missing: ['last_name', 'address_line_1'],
      },
    });
  });

  it('never lets an extra field override message, error or status', () => {
    const err = new ForbiddenException({
      message: 'Nope',
      error: 'X',
      status: 200,
      statusCode: 200,
    });
    expect(run(err)).toEqual({
      status: 403,
      body: { message: 'Nope', error: 'ForbiddenException', status: 403 },
    });
  });
});
