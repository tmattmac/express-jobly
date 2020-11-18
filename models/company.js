const db = require('../db');
const buildWhereClause = require('../helpers/buildWhereClause');
const ExpressError = require('../helpers/expressError');
const sqlForPartialUpdate = require('../helpers/partialUpdate');

/**
 * Class for database operations related to companies.
 */

class Company {

    /**
     * condition map used for buildWhereClause in Company.getAll
     */

    static conditionMap = {
        search: ['name', 'ilike'],
        min_employees: ['num_employees', '>='],
        max_employees: ['num_employees', '<=']
    }

    /**
     * get: get company by handle
     * @param {string} handle - the handle to get by
     * @return {Object} { handle, name, num_employees, description, logo_url,
     *      jobs: [{ id, title, date_posted, salary, equity }...] }
     * @throws {ExpressError} with 404 status if no company is found.
     */

    static async get(handle) {
        const query = `
            SELECT c.handle, c.name, c.num_employees, c.description, c.logo_url,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id',           j.id,
                        'title',        j.title,
                        'date_posted',  j.date_posted,
                        'salary',       j.salary,
                        'equity',       j.equity
                    )
                ) AS jobs
            FROM companies c
            LEFT JOIN jobs j
            ON c.handle = j.company_handle
            WHERE c.handle = $1
            GROUP BY c.handle
        `;

        const { rows: [company] } = await db.query(query, [handle]);

        if (!company) {
            throw new ExpressError(`Company '${handle}' not found`, 404);
        }

        // query returns array with null job if none exist, remove if so
        if (!company.jobs[0].id) company.jobs.pop();

        return company;
    }

    /**
     * getAll: get array of all companies
     * @param {Object} [params] - Optional search parameters.
     *      Currently supports search, min_employees, max_employees.
     * @return {Array} [{ handle, name }...]
     * @throws {ExpressError} with 400 status if max_employees < min_employees
     */

    static async getAll(params = {}) {
        let query = `SELECT handle, name FROM companies `;

        // check if min_employees > max_employees
        if (params.min_employees && params.max_employees && 
            params.min_employees > params.max_employees) {
            throw new ExpressError(
                'min_employees must be less than max_employees', 400);
        }

        let { clause, values } =
            buildWhereClause(params, Company.conditionMap);
        query += clause;

        const { rows } = await db.query(query, values);
        return rows;
    }

    /**
     * create: create new company with provided data
     * @param {Object} companyData - Object with company data.
     *      Required fields: handle, name.
     *      Optional fields: num_employees, description, logo_url.
     * @return {Object} The newly created company:
     *      { handle, name, num_employees, description, logo_url }
     * @throws {ExpressError} with 400 status if handle or company name is
     *      in use, or if required fields aren't provided.
     */

    static async create(companyData) {
        const query = `
            INSERT INTO companies 
                (handle, name, num_employees, description, logo_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING handle, name, num_employees, description, logo_url
        `;
        const values = [
            companyData.handle,
            companyData.name,
            companyData.num_employees,
            companyData.description,
            companyData.logo_url
        ];

        try {
            const { rows: [company] } = await db.query(query, values);
            return company;
        } catch (e) {
            if (e.code === '23505') { // unique key violation
                throw new ExpressError(
                    'Company name or handle already in use', 400
                );
            }
            throw e;
        }
    }

    /**
     * update: update company with provided data
     * @param {string} handle - Handle of the company to update.
     * @param {Object} newData - Object with data to update company with. 
     *      Can update handle, name, num_employees, description, logo_url.
     * @return {Object} the updated company:
     *      { handle, name, num_employees, description, logo_url }
     * @throws {ExpressError} with 400 status if handle or company name is
     *      in use.
     */

    static async update(handle, newData) {
        const { query, values } = sqlForPartialUpdate(
            'companies', newData, 'handle', handle
        );

        try {
            const { rows: [company] } = await db.query(query, values);
            if (!company) {
                throw new ExpressError(`Company '${handle}' not found`, 404);
            }
            return company;
        } catch (e) {
            if (e.code === '23505') { // unique key violation
                throw new ExpressError(
                    'Company name or handle already in use', 400);
            }
            throw e;
        }
    }

    /**
     * delete: delete company with provided handle
     * @param {string} handle - Handle of the company to delete.
     * @return {string} The handle of the deleted company.
     * @throws {ExpressError} with 404 status if no company is found.
     */
    
    static async delete(handle) {
        const query = `
            DELETE FROM companies WHERE handle = $1 RETURNING handle;
        `;
        const { rows: [company] } = await db.query(query, [handle]);
        if (!company) {
            throw new ExpressError(`Company '${handle}' not found`, 404);
        }
        return handle;
    }
}

module.exports = Company;