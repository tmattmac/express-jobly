process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');
const jwt = require('jsonwebtoken');

const tokens = {};
let _token;

beforeEach(async () => {
    await db.query(`
        INSERT INTO companies (handle, name, num_employees, description, logo_url)
        VALUES
            ('test_1', 'Test Company 1', 50, 'First test company', 'a.jpg'),
            ('test_2', 'Test Company 2', 100, 'Second test company', 'b.jpg'),
            ('test_3', 'Test Company 3', 150, 'Third test company', 'c.jpg'),
            ('test_4', 'Test Company 4', 200, 'Fourth test company' 'd.jpg'),
            ('test_5', 'Outlier Company', 100, 'Fifth test company' 'e.jpg')
    `);
    await db.query(`
        INSERT INTO jobs (title, salary, equity, company_handle)
        VALUES
            ('Software Developer I', 60000, 0.1, test_1),
            ('Software Developer II', 80000, 0.15, test_1),
            ('Database Administrator', 65000, 0.1, test_1),
            ('COBOL Developer', 150000, 0.15, test_1),
            ('Software Developer I', 65000, 0.05, test_2),
            ('Systems Analyst II', 85000, 0.1, test_2),
            ('Software Developer II', 90000, 0.2, test_3)
    `);

    tokens.admin = jwt.sign({ username: 'admin', is_admin: true }, SECRET_KEY);
    tokens.u1 = jwt.sign({ username: 'u1', is_admin: false }, SECRET_KEY);
    _token = tokens.admin; // default to admin token
});

afterEach(async () => {
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM jobs');
});

afterAll(async () => {
    await db.end();
});

describe('GET /companies', () => {
    test('returns a list of companies', async () => {
        const res = await request(app)
            .get(`/companies`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(5);
        expect(res.body.companies).toEqual(
            expect.arrayContaining({
                handle: 'test_1',
                name: 'Test Company 1'
            })
        );
    });

    test('returns an empty list if no companies exist', async () => {
        await db.query('DELETE FROM companies');
        const res = await request(app)
            .get(`/companies`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(0);
    });
    
    test('searching with query returns only matching companies', async () => {
        let res = await request(app)
            .get(`/companies`)
            .query({ search: 'Test Company' })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(4);
        expect(res.body.companies).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({ name: 'Outlier Company' })
            )
        );

        res = await request(app)
            .get(`/companies`)
            .query({ search: 'Outlier Company' })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(1);
        expect(res.body.companies).toEqual(
            expect.arrayContaining(
                expect.objectContaining({ name: 'Outlier Company' })
            )
        );
    });
    
    test('searching with min_employees returns only matching companies', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({ min_employees: 150 })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(3);
        expect(res.body.companies).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    name: 'Test Company 1'
                })
            )
        );
    });
    
    test('searching with max_employees returns only matching companies', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({ max_employees: 150 })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(3);
        expect(res.body.companies).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    name: 'Test Company 4'
                })
            )
        );
    });
    
    test('searching with all query params returns only matching companies', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({
                min_employees: 150,
                max_employees: 200,
                search: 'Test Company 4'
            })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(1);
        expect(res.body.companies).toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    name: 'Test Company 4'
                })
            )
        );
    });
    
    test('min_employees > max_employees returns 400 status', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({
                min_employees: 150,
                max_employees: 100
            })
            .send({ _token });
        expect(res.statusCode).toBe(400);
    });

    test('returns empty list if no companies found', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({ search: 'Not a Company' })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.companies).toHaveLength(0);
    });
});

describe('GET /companies/:handle', () => {
    test('returns a single company', async () => {
        const res = await request(app)
            .get(`/companies/test_1`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual({
            handle: 'test_1',
            name: 'Test Company 1',
            num_employees: 50,
            description: 'First test company',
            logo_url: 'a.jpg',
            jobs: expect.arrayContaining([
                expect.objectContaining({
                    id: expect.any(Number),
                    date_posted: expect.anything(),
                    title: 'Software Developer I'
                })
            ])
        });
        expect(res.body.company.jobs).toHaveLength(4);
    });

    test('returns 404 status if company not found', async () => {
        const res = await request(app)
            .get(`/companies/fail`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /companies', () => {
    test('creates a new company', async () => {
        let res = await request(app)
            .post(`/companies`)
            .send({
                handle: 'test_6',
                name: 'Test Company 6',
                num_employees: 500,
                description: 'Sixth test company',
                logo_url: 'f.jpg',
                _token
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.company).toEqual({
            handle: 'test_6',
            name: 'Test Company 6',
            num_employees: 500,
            description: 'Sixth test company',
            logo_url: 'f.jpg',
        });

        res = await request(app)
            .get(`/companies/test_6`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 6'
            })
        );
    });

    test('creates a new company without optional fields', async () => {
        let res = await request(app)
            .post(`/companies`)
            .send({
                handle: 'test_6',
                name: 'Test Company 6',
                num_employees: 500,
                _token
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            handle: 'test_6',
            name: 'Test Company 6',
            num_employees: 500,
            description: null,
            logo_url: null,
        });

        res = await request(app)
            .get(`/companies/test_6`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 6'
            })
        );
    });

    test('returns 400 status if data is invalid or missing', async () => {
        let res = await request(app)
            .post(`/companies`)
            .send({
                handle: 'test_6',
                num_employees: 500,
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/companies/test_6`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });

    test('returns 400 status if company handle exists', async () => {
        let res = await request(app)
            .post(`/companies`)
            .send({
                handle: 'test_1',
                name: 'Test Company 6',
                num_employees: 500,
                _token
            });
        expect(res.statusCode).toBe(400);
    });
    
    test('returns 400 status if company name exists', async () => {
        let res = await request(app)
            .post(`/companies`)
            .send({
                handle: 'test_6',
                name: 'Test Company 1',
                num_employees: 500,
                _token
            });
        expect(res.statusCode).toBe(400);
    });
});

describe('PATCH /companies/:handle', () => {
    test('fully updates an existing company', async () => {
        let res = await request(app)
            .patch(`/companies/test_1`)
            .send({
                handle: 'test_6',
                name: 'Test Company 6',
                num_employees: 500,
                description: 'Sixth test company',
                logo_url: 'f.jpg',
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual({
            handle: 'test_6',
            name: 'Test Company 6',
            num_employees: 500,
            description: 'Sixth test company',
            logo_url: 'f.jpg',
        });

        res = await request(app)
            .get(`/companies/test_6`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual({
            handle: 'test_6',
            name: 'Test Company 6',
            num_employees: 500,
            description: 'Sixth test company',
            logo_url: 'f.jpg',
        });
    });

    test('partially updates an existing company', async () => {
        let res = await request(app)
            .patch(`/companies/test_1`)
            .send({
                num_employees: 500,
                description: 'New description',
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            handle: 'test_1',
            name: 'Test Company 1',
            num_employees: 500,
            description: 'New description',
            logo_url: 'a.jpg',
        });

        res = await request(app)
            .get(`/companies/test_1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 1',
                num_employees: 500,
                description: 'New description'
            })
        );
    });

    test('returns 400 status if data is invalid', async () => {
        let res = await request(app)
            .patch(`/companies/test_1`)
            .send({
                num_employees: -500,
                description: 'New description',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/companies/test_1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 1',
                num_employees: 50,
                description: 'First test company'
            })
        );
    });

    test('returns 400 status if company name exists', async () => {
        let res = await request(app)
            .patch(`/companies/test_1`)
            .send({
                name: 'Test Company 2',
                description: 'New description',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/companies/test_1`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 1',
                description: 'First test company'
            })
        );
    });
    
    test('returns 400 status if company handle exists', async () => {
        let res = await request(app)
            .patch(`/companies/test_1`)
            .send({
                handle: 'test_2',
                description: 'New description',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/companies/test_2`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.company).toEqual(
            expect.objectContaining({
                name: 'Test Company 2',
                description: 'Second test company'
            })
        );
    });

    test('returns 404 status if company not found', async () => {
        let res = await request(app)
            .patch(`/companies/fail`)
            .send({
                handle: 'test_6',
                name: 'Test Company 6',
                description: 'Sixth test company',
                _token
            });
        expect(res.statusCode).toBe(404);

        res = await request(app)
            .get(`/companies/test_6`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /companies/:handle', () => {
    test('deletes a company', async () => {
        let res = await request(app)
            .delete(`/companies/test_1`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(200);
        
        res = await request(app)
            .get(`/companies/test_1`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(404);
    });

    test('returns 404 status if company not found', async () => {
        let res = await request(app)
            .delete(`/companies/fail`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(404);
    });
});