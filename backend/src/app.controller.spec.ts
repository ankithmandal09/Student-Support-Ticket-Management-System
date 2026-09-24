import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
describe('AppController', () => {
  it('reports process health', () => {
    expect(new AppController(new AppService()).health()).toEqual({
      status: 'ok',
      service: 'student-support-api',
    });
  });
});
