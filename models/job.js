const db = require('../db');
const buildWhereClause = require('../helpers/buildWhereClause');
const ExpressError = require('../helpers/expressError');
const sqlForPartialUpdate = require('../helpers/partialUpdate');

/**
 * Class for database operations related to jobs.
 */

class Job {

    /**
     * condition map for buildWhereClause in Job.getAll
     */

    static conditionMap = {
        search: ['title', 'ilike'],
        min_salary: ['salary', '>='],
        min_equity: ['equity', '>=']
    }

    /**
     * get: get job by id
     * @param {string} id - the handle to get by
     * @return {Object} { id, title, salary, equity, date_posted, 
     *      company: { handle, name, num_employees, description, logo_url } }
     * @throws {ExpressError} with 404 status if no job is found.
     */

    static async get(id) {
        const query = `
            SELECT j.id, j.title, j.salary, j.equity, j.date_posted,
                JSON_BUILD_OBJECT(
                    'handle',           c.handle,
                    'name',             c.name,
                    'num_employees',    c.num_employees,
                    'description',      c.description,
                    'logo_url',         c.logo_url
                ) AS company
            FROM jobs j
            JOIN companies c
            ON j.company_handle = c.handle
            WHERE j.id = $1
        `;

        const { rows: [job] } = await db.query(query, [id]);

        if (!job) {
            throw new ExpressError(`Company with id ${id} not found`, 404);
        }

        return job;
    }

    /**
     * getAll: get array of all jobs
     * @param {Object} [params] - Optional search parameters.
     *      Currently supports query, min_salary, min_equity.
     * @return {Array} [{ id, title, company_handle }...]
     */

    static async getAll(params) {
        let query = `SELECT id, title, company_handle FROM jobs `

        let { clause, values } =
            buildWhereClause(params, Job.conditionMap);
        query += clause;

        const { rows } = await db.query(query, values);
        return rows;
    }

    /**
     * create: create new job with provided data
     * @param {Object} jobData - Object with job data.
     *      Required fields: title, salary, equity, company_handle.
     * @return {Object} The newly created job:
     *      { id, title, salary, equity, date_posted, company_handle }
     * @throws {ExpressError} with 400 status if provided company_handle
     *      doesn't exist, if required data isn't provided, or if equity or
     *      salary fall out of range
     */

    static async create(jobData) {
        const query = `
            INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, date_posted, company_handle
        `;
        const values = [
            jobData.title,
            jobData.salary,
            jobData.equity,
            jobData.company_handle
        ];

        try {
            const { rows: [job] } = await db.query(query, values);
            return job;
        } catch (e) {
            if (e.code === '23503') { // foreign key violation
                throw new ExpressError(
                    `Company handle '${jobData.handle}' doesn't exist`, 400
                );
            }
            throw e;
        }
    }

    /**
     * update: update job with provided data
     * @param {string} id - ID of the job to update.
     * @param {Object} newData - Object with data to update job with. 
     *      Can update title, salary, equity.
     * @return {Object} the updated job:
     *      { id, title, salary, equity, date_posted, company_handle }
     * @throws {ExpressError} with 400 status if equity or salary fall out 
     *      of range
     */

    static async update(id, newData) {
        const { query, values } = sqlForPartialUpdate(
            'jobs', newData, 'id', id
        );

        const { rows: [job] } = await db.query(query, values);
        if (!job) {
            throw new ExpressError('Job with id ${id} not found', 404);
        }
        return job;
    }

    /**
     * delete: delete job with provided id
     * @param {string} id - ID of the job to delete.
     * @return {string} The title of the deleted job.
     * @throws {ExpressError} with 404 status if no job is found.
     */
    
    static async delete(id) {
        const query = `
            DELETE FROM jobs WHERE id = $1 RETURNING id;
        `;
        const { rows: [job] } = await db.query(query, [id]);
        if (!job) {
            throw new ExpressError(`Job with id '${id}' not found`, 404);
        }
        return id;
    }
    
}

module.exports = Job;