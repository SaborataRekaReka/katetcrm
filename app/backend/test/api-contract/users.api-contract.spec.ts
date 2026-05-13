import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  TEST_ADMIN,
  TEST_MANAGER,
  ensureBaseUsers,
  loginByPassword,
} from '../helpers/auth-fixtures';
import { authHeader, uniqueSeed } from '../helpers/domain-fixtures';
import { closeTestApp, createTestApp } from '../helpers/test-app';

describe('API Contract - Users (QA-REQ: 033, 035, 038)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  function uniqueEmail(prefix: string) {
    const seed = uniqueSeed(prefix).toLowerCase().replace(/[^a-z0-9]+/g, '.');
    return `${seed}@katet.local`;
  }

  async function adminHeaders() {
    const login = await loginByPassword(app, TEST_ADMIN);
    return {
      login,
      headers: { Authorization: authHeader(login.accessToken) },
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await ensureBaseUsers(prisma);

    const { headers } = await adminHeaders();
    await request(app.getHttpServer())
      .patch('/api/v1/users/permissions-matrix/admin.users')
      .set(headers)
      .send({ admin: true })
      .expect(200);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('USERS-001 (QA-REQ-038): admin creates a user with explicit email and temporary password', async () => {
    const { headers } = await adminHeaders();
    const email = uniqueEmail('users001');
    const password = 'TempPass123';

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(headers)
      .send({
        email,
        fullName: 'QA Created Manager',
        password,
        role: 'manager',
        isActive: true,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      email,
      fullName: 'QA Created Manager',
      role: 'manager',
      isActive: true,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
  });

  it('USERS-002 (QA-REQ-038): admin updates email and resets password for access recovery', async () => {
    const { headers } = await adminHeaders();
    const email = uniqueEmail('users002');
    const nextEmail = email.replace('@katet.local', '.renamed@katet.local');

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(headers)
      .send({
        email,
        fullName: 'QA Password Reset Manager',
        password: 'OldPass123',
        role: 'manager',
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${created.body.id}`)
      .set(headers)
      .send({ email: nextEmail, password: 'NewPass123' })
      .expect(200)
      .expect((response) => {
        expect(response.body.email).toBe(nextEmail);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'OldPass123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: nextEmail, password: 'NewPass123' })
      .expect(200);
  });

  it('USERS-003 (QA-REQ-038): inactive users cannot login and are hidden from manager selectors', async () => {
    const { headers } = await adminHeaders();
    const email = uniqueEmail('users003');

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(headers)
      .send({
        email,
        fullName: 'QA Inactive Manager',
        password: 'Inactive123',
        role: 'manager',
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${created.body.id}`)
      .set(headers)
      .send({ isActive: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.isActive).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Inactive123' })
      .expect(401);

    const managers = await request(app.getHttpServer())
      .get('/api/v1/users/managers')
      .set(headers)
      .expect(200);

    expect(managers.body.some((item: { id: string }) => item.id === created.body.id)).toBe(false);
  });

  it('USERS-004 (QA-REQ-033, 035, 038): manager cannot manage users or admin-only permissions', async () => {
    const manager = await loginByPassword(app, TEST_MANAGER);
    const managerHeaders = { Authorization: authHeader(manager.accessToken) };

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(managerHeaders)
      .send({
        email: uniqueEmail('users004'),
        fullName: 'Forbidden Manager Create',
        password: 'Forbidden123',
        role: 'manager',
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${manager.user.id}`)
      .set(managerHeaders)
      .send({ role: 'admin' })
      .expect(403);

    const { headers } = await adminHeaders();
    await request(app.getHttpServer())
      .patch('/api/v1/users/permissions-matrix/admin.users')
      .set(headers)
      .send({ manager: true })
      .expect(400);

    const matrix = await request(app.getHttpServer())
      .get('/api/v1/users/permissions-matrix')
      .set(headers)
      .expect(200);

    const usersCapability = (matrix.body.capabilities as Array<{
      id: string;
      matrix: { manager: boolean };
    }>).find((item) => item.id === 'admin.users');

    expect(usersCapability?.matrix.manager).toBe(false);
  });

  it('USERS-005 (QA-REQ-038): admin cannot lock out the current admin account', async () => {
    const { login, headers } = await adminHeaders();

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${login.user.id}`)
      .set(headers)
      .send({ isActive: false })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${login.user.id}`)
      .set(headers)
      .send({ role: 'manager' })
      .expect(400);
  });
});