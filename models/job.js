/**
 * Class for database operations related to jobs.
 */

class Job {

    /**
     * get: get job by id
     * @param {string} id - the handle to get by
     * @return {Object} { id, title, salary, equity, date_posted, 
     *      company: { handle, name } }
     * @throws {ExpressError} with 404 status if no job is found.
     */

    static get(id) {

    }

    /**
     * getAll: get array of all jobs
     * @param {Object} [params] - Optional search parameters.
     *      Currently supports query, min_salary, max_salary.
     * @return {Array} [{ id, title, date_posted, company_name }...]
     * @throws {ExpressError} with 400 status if max_salary > min_salary
     */

    static getAll(params) {

    }

    /**
     * create: create new job with provided data
     * @param {Object} jobData - Object with job data.
     *      Required fields: title, salary, equity, company_handle.
     * @return {Object} The newly created job:
     *      { id, title, salary, equity, date_posted, 
     *      company: { handle, name } }
     * @throws {ExpressError} with 400 status if provided company_handle
     *      doesn't exist, if required data isn't provided, or if equity or
     *      salary fall out of range
     */

    static create(jobData) {

    }

    /**
     * update: update job with provided data
     * @param {string} id - ID of the job to update.
     * @param {Object} newData - Object with data to update job with. 
     *      Can update title, salary, equity.
     * @return {Object} the updated job:
     *      { id, title, salary, equity, date_posted, 
     *      company: { handle, name } }
     * @throws {ExpressError} with 400 status if equity or salary fall out 
     *      of range
     */

    static update(id, newData) {
        
    }

    /**
     * delete: delete job with provided id
     * @param {string} id - ID of the job to delete.
     * @return {string} The title of the deleted job.
     * @throws {ExpressError} with 404 status if no job is found.
     */
    
    static delete(id) {
        
    }
    
}

module.exports = Job;