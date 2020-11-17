process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');

const tokens = {};
let _token;

const admin = {
    username: 'admin',
    password: 'password',
    first_name: 'Test',
    last_name: 'Admin',
    email: 'admin@test.com'
}

const u1 = {
    username: 'u1',
    password: 'password',
    first_name: 'Test',
    last_name: 'User 1',
    email: 'u1@test.com'
}

const u2 = {
    username: 'u2',
    password: 'password',
    first_name: 'Test',
    last_name: 'User 2',
    email: 'u2@test.com'
}

beforeEach(async () => {
    await User.register(admin);
    await User.register(u1);
    await User.register(u2);
    db.query(`UPDATE users SET is_admin=true WHERE username=admin`);
    
    tokens.admin = jwt.sign({ username: 'admin', is_admin: true }, SECRET_KEY);
    tokens.u1 = jwt.sign({ username: 'u1', is_admin: false }, SECRET_KEY);
    tokens.u2 = jwt.sign({ username: 'u2', is_admin: false }, SECRET_KEY);
    _token = tokens.admin; // default to admin token
});

afterEach(async () => {
    await db.query('DELETE FROM users');
});

afterAll(async () => {
    await db.end();
});

describe('GET /users', () => {
    test('returns a list of users', async () => {
        const res = await request(app)
            .get(`/users`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.users).toHaveLength(3);
        expect(res.body.users).toEqual(
            expect.arrayContaining({
                username: 'u1',
                first_name: 'Test',
                last_name: 'User 1',
                email: 'u1@test.com'
            })
        );
    });
});

describe('GET /users/:username', () => {
    test('returns a single user', async () => {
        const res = await request(app)
            .get(`/users/u1`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u1',
            first_name: 'Test',
            last_name: 'User 1',
            email: 'u1@test.com',
            photo_url: null,
            is_admin: false
        });
    });

    test('returns 404 status if user not found', async () => {
        const res = await request(app)
            .get(`/users/fail`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /users', () => {
    test('registers a new user', async () => {
        let res = await request(app)
            .post(`/users`)
            .send({
                username: 'u3',
                password: 'password',
                first_name: 'Test',
                last_name: 'User 3',
                email: 'u3@test.com'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.user).toEqual({
            username: 'u3',
            password: 'password',
            first_name: 'Test',
            last_name: 'User 3',
            email: 'u3@test.com',
            photo_url: null,
            is_admin: false
        });
        expect(jwt.decode(res.body.token)).toEqual({
            username: 'u3',
            is_admin: false
        });
        
        res = await request(app)
            .get(`/users/u3`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u3',
            password: 'password',
            first_name: 'Test',
            last_name: 'User 3',
            email: 'u3@test.com',
            photo_url: null,
            is_admin: false
        });
    });

    test('returns 400 status if data is missing', async () => {
        let res = await request(app)
            .post(`/users`)
            .send({
                username: 'u3',
                password: 'password',
                email: 'u3@test.com'
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/users/u3`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });

    test('returns 400 status if username already exists', async () => {
        let res = await request(app)
            .post(`/users`)
            .send({
                username: 'u1',
                password: 'password',
                first_name: 'Test',
                last_name: 'User 3',
                email: 'u3@test.com'
            });
        expect(res.statusCode).toBe(400);
        
        res = await request(app)
            .get(`/users/u1`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('u1@test.com');
    });

    test('returns 400 status if email already exists', async () => {
        let res = await request(app)
            .post(`/users`)
            .send({
                username: 'u3',
                password: 'password',
                first_name: 'Test',
                last_name: 'User 3',
                email: 'u1@test.com'
            });
        expect(res.statusCode).toBe(400);
        
        res = await request(app)
            .get(`/users/u3`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});

describe('PATCH /users/:username', () => {
    test('only logged in user can update own data', async () => {
        let _token = tokens.u2;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                username: 'u3',
                first_name: 'Name',
                last_name: 'Test 3',
                email: 'u3@test.com',
                photo_url: 'g.jpg',
                _token
            });
        expect(res.statusCode).toBe(401);

        res = await request(app)
            .get(`/users/u3`)
            .send({ _token })
        expect(res.statusCode).toBe(404);
    });

    test('fully updates an existing user', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                username: 'u3',
                first_name: 'Name',
                last_name: 'Test 3',
                email: 'u3@test.com',
                photo_url: 'g.jpg',
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u3',
            first_name: 'Name',
            last_name: 'Test 3',
            email: 'u3@test.com',
            photo_url: 'g.jpg',
            is_admin: false
        });

        res = await request(app)
            .get(`/users/u3`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u3',
            first_name: 'Name',
            last_name: 'Test 3',
            email: 'u3@test.com',
            photo_url: 'g.jpg',
            is_admin: false
        });
    });

    test('partially updates an existing user', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                email: 'u3@test.com',
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u1',
            first_name: 'Test',
            last_name: 'User 1',
            email: 'u3@test.com',
            photo_url: null,
            is_admin: false
        });

        res = await request(app)
            .get(`/users/u3`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual({
            username: 'u1',
            first_name: 'Test',
            last_name: 'User 1',
            email: 'u3@test.com',
            photo_url: null,
            is_admin: false
        });
    });

    test('returns 400 status if data is invalid', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                email: '',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/users/u1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual(
            expect.objectContaining({
                email: 'u1@test.com'
            })
        );
    });

    test('returns 400 status if username is taken', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                username: 'u2',
                first_name: 'Should Not Change',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/users/u1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual(
            expect.objectContaining({
                first_name: 'Test'
            })
        );
    });

    test('returns 400 status if email is taken', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .patch(`/users/u1`)
            .send({
                email: 'u2@test.com',
                first_name: 'Should Not Change',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/users/u1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual(
            expect.objectContaining({
                first_name: 'Test',
                email: 'u1@test.com'
            })
        );
    });
});

describe('DELETE /jobs/:id', () => {
    test('only logged in user can delete own data', async () => {
        let _token = tokens.u2;
        let res = await request(app)
            .delete(`/users/u1`)
            .send({ _token });
        expect(res.statusCode).toBe(401);

        res = await request(app)
            .get(`/users/u1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
    });

    test('deletes a user', async () => {
        let _token = tokens.u1;
        let res = await request(app)
            .delete(`/users/u1`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        
        res = await request(app)
            .get(`/users/u1`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});