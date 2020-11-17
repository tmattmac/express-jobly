process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');
const jwt = require('jsonwebtoken');

const tokens = {};
let _token;

let jobs = [];

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
    const { rows } = await db.query(`
        INSERT INTO jobs (title, salary, equity, company_handle)
        VALUES
            ('Software Developer I', 60000, 0.1, test_1),
            ('Software Developer II', 80000, 0.15, test_1),
            ('Database Administrator', 65000, 0.1, test_1),
            ('COBOL Developer', 150000, 0.15, test_1),
            ('Software Developer I', 65000, 0.05, test_2),
            ('Systems Analyst II', 85000, 0.1, test_2),
            ('Software Developer II', 90000, 0.2, test_3)
        RETURNING id
    `);
    jobs = rows;

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

describe('GET /jobs', () => {
    test('returns a list of jobs', async () => {
        const res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(7);
        expect(res.body.jobs).toEqual(
            expect.arrayContaining({
                id: expect.any(Number),
                title: 'Software Developer I',
                company_handle: 'test_1'
            })
        );
    });

    test('returns an empty list if no jobs exist', async () => {
        await db.query('DELETE FROM jobs');
        const res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(0);
    });
    
    test('searching with query returns only matching jobs', async () => {
        let res = await request(app)
            .get(`/jobs`)
            .query({ search: 'Software Developer' })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(4);
        expect(res.body.jobs).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({ title: 'COBOL Developer' })
            )
        );

        res = await request(app)
            .get(`/jobs`)
            .query({ search: 'COBOL Developer' })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs).toEqual(
            expect.arrayContaining(
                expect.objectContaining({ title: 'COBOL Developer' })
            )
        );
    });
    
    test('searching with min_salary returns only matching jobs', async () => {
        const res = await request(app)
            .get(`/jobs`)
            .query({ min_salary: 80000 })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(4);
        expect(res.body.jobs).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    title: 'Software Developer I'
                })
            )
        );
    });
    
    test('searching with min_equity returns only matching jobs', async () => {
        const res = await request(app)
            .get(`/jobs`)
            .query({ min_equity: 0.15 })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(3);
        expect(res.body.jobs).not.toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    title: 'Database Administrator'
                })
            )
        );
    });
    
    test('searching with all query params returns only matching jobs', async () => {
        const res = await request(app)
            .get(`/jobs`)
            .query({
                min_salary: 80000,
                min_equity: 0.17,
                search: 'Software Developer'
            })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(1);
        expect(res.body.jobs).toEqual(
            expect.arrayContaining(
                expect.objectContaining({
                    company_handle: 'test_3'
                })
            )
        );
    });

    test('returns empty list if no companies found', async () => {
        const res = await request(app)
            .get(`/companies`)
            .query({ min_equity: 0.25 })
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.jobs).toHaveLength(0);
    });
});

describe('GET /jobs/:id', () => {
    test('returns a single job', async () => {
        const job = jobs[0]
        const res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toBe(
            expect.objectContaining({
                id: job.id,
                title: job.title,
                company: expect.objectContaining({
                    handle: job.company_handle
                })
            })
        );
    });

    test('returns 404 status if job not found', async () => {
        const res = await request(app)
            .get(`/jobs/0`)
            .send({ _token });
        expect(res.statusCode).toBe(404);
    });
});

describe('POST /jobs', () => {
    test('only admins can access route', () => {
        let _token = tokens.u1;
        let res = await request(app)
            .post(`/jobs`)
            .send({
                title: 'Test Job Title',
                salary: 20000,
                equity: 0.5,
                company_handle: 'test_1',
                _token
            });
        expect(res.statusCode).toBe(401);

        res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.body.jobs).toHaveLength(7);
    });

    test('creates a new job', async () => {
        let res = await request(app)
            .post(`/jobs`)
            .send({
                title: 'Test Job Title',
                salary: 20000,
                equity: 0.5,
                company_handle: 'test_1',
                _token
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.job).toEqual({
            id: expect.any(Number),
            title: 'Test Job Title',
            salary: 20000,
            equity: 0.5,
            company_handle: 'test_1',
        });
        
        const jobId = res.body.job.id;
        res = await request(app)
            .get(`/jobs/${jobId}`)
            .send({ _token });
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toBe(
            expect.objectContaining({
                id: jobId,
                title: 'Test Job Title',
                salary: 20000,
                equity: 0.5,
                company: expect.objectContaining({
                    handle: 'test_1',
                    name: 'Test Company 1'
                })
            })
        );
    });

    test('returns 400 status if data is missing', async () => {
        let res = await request(app)
            .post(`/jobs`)
            .send({
                title: 'Test Job Title',
                equity: 0.01,
                company_handle: 'test_1',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.body.jobs).toHaveLength(7);
    });

    test('returns 400 status if data is invalid', async () => {
        let res = await request(app)
            .post(`/jobs`)
            .send({
                title: 'Test Job Title',
                equity: 0.01,
                salary: -50,
                company_handle: 'test_1',
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.body.jobs).toHaveLength(7);
    });

    test('returns 400 status if company handle does not exist', async () => {
        let res = await request(app)
            .post(`/jobs`)
            .send({
                company_handle: 'fail',
                title: 'Test Job title',
                salary: 33333,
                equity: 0.33,
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/jobs`)
            .send({ _token });
        expect(res.body.jobs).toHaveLength(7);
    });
});

describe('PATCH /jobs/:id', () => {
    test('only admins can access route', () => {
        let _token = tokens.u1;
        const job = jobs[0];
        let res = await request(app)
            .patch(`/jobs/${job.id}`)
            .send({
                title: 'Test Job Title',
                salary: 100,
                equity: 0.95,
                _token
            });
        expect(res.statusCode).toBe(401);

        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({ _token });
        expect(res.body.job).toEqual(
            expect.objectContaining({
                id: job.id,
                title: job.title
            })
        );
    });

    test('fully updates an existing job', async () => {
        const job = jobs[0];
        let res = await request(app)
            .patch(`/jobs/${job.id}`)
            .send({
                title: 'Test Job Title',
                salary: 100,
                equity: 0.95,
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toEqual({
            id: job.id,
            title: 'Test Job Title',
            salary: 100,
            equity: 0.95,
            date_posted: expect.anything(),
            company_handle: job.company_handle
        });

        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toEqual({
            id: job.id,
            title: 'Test Job Title',
            salary: 100,
            equity: 0.95,
            date_posted: expect.anything(),
            company: expect.objectContaining({
                handle: job.company_handle
            })
        });
    });

    test('partially updates an existing job', async () => {
        const job = jobs[0];
        let res = await request(app)
            .patch(`/jobs/${job.id}`)
            .send({
                title: 'Test Job Title',
                _token
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toEqual({
            id: job.id,
            title: 'Test Job Title',
            salary: job.salary,
            equity: job.equity,
            date_posted: expect.anything(),
            company_handle: job.company_handle
        });

        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toEqual({
            id: job.id,
            title: 'Test Job Title',
            salary: job.salary,
            equity: job.equity,
            date_posted: expect.anything(),
            company: expect.objectContaining({
                handle: job.company_handle
            })
        });
    });

    test('returns 400 status if data is invalid', async () => {
        const job = jobs[0];
        let res = await request(app)
            .patch(`/jobs/${job.id}`)
            .send({
                salary: -500,
                _token
            });
        expect(res.statusCode).toBe(400);

        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({ _token })
        expect(res.statusCode).toBe(200);
        expect(res.body.job).toEqual(
            expect.objectContaining({
                id: job.id,
                salary: job.salary
            })
        );
    });

    test('returns 404 status if company not found', async () => {
        let res = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: 'Test Job Title',
                _token
            });
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /jobs/:id', () => {
    test('only admins can access route', () => {
        let _token = tokens.u1;
        const job = jobs[0];
        let res = await request(app)
            .delete(`/jobs/${job.id}`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(401);
        
        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(200);
    });

    test('deletes a job', async () => {
        const job = jobs[0];
        let res = await request(app)
            .delete(`/jobs/${job.id}`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(200);
        
        res = await request(app)
            .get(`/jobs/${job.id}`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(404);
    });

    test('returns 404 status if job not found', async () => {
        let res = await request(app)
            .delete(`/jobs/0`)
            .send({
                _token
            });
        expect(res.statusCode).toBe(404);
    });
});