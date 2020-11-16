/**
 * Class for database operations related to companies.
 */

class Company {

    /**
     * get: get company by handle
     * @param {string} handle - the handle to get by
     * @return {Object} { handle, name, num_employees, description, logo_url }
     * @throws {ExpressError} with 404 status if no company is found.
     */

    static get(handle) {

    }

    /**
     * getAll: get array of all companies
     * @param {Object} [params] - Optional search parameters.
     *      Currently supports query, min_employees, max_employees.
     * @return {Array} [{ handle, name, num_employees, logo_url }...]
     * @throws {ExpressError} with 400 status if max_employees < min_employees
     */

    static getAll(params) {

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

    static create(companyData) {

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

    static update(handle, newData) {

    }

    /**
     * delete: delete company with provided handle
     * @param {string} handle - Handle of the company to delete.
     * @return {string} The name of the deleted company.
     * @throws {ExpressError} with 404 status if no company is found.
     */
    
    static delete(handle) {

    }
}

module.exports = Company;