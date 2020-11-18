const express = require('express');
const ExpressError = require('../helpers/expressError');
const { requireAdmin, requireLogin } = require('../middleware/auth');
const Job = require('../models/job');

const jsonschema = require('jsonschema');
const jobCreateSchema = require('../validators/jobCreate.json');
const jobUpdateSchema = require('../validators/jobUpdate.json');

const router = express.Router();

/**
 * GET /jobs
 * Request body requires _token
 * Optional query parameters: search, min_salary, min_equity
 * Returns { jobs: [{ id, title, company_handle }...]}
 */

router.get('/', requireLogin, async (req, res, next) => {
    try {
        const params = req.query;
        const jobs = await Job.getAll(params);
        return res.json({ jobs });
    } catch (e) {
        return next(e);
    }
});

/**
 * GET /jobs/:id
 * Request body requires _token
 * Returns { 
 *      job: { 
 *          id, 
 *          title,
 *          salary,
 *          equity,
 *          date_posted,
 *          company: {
 *              handle,
 *              name,
 *              num_employees,
 *              description,
 *              logo_url
 *          }
 *      }
 * }
 * Throws 404 if handle not found
 */

router.get('/:id', requireLogin, async (req, res, next) => {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (e) {
        return next(e);
    }
});

/**
 * POST /jobs
 * Required fields: title, salary, equity, company_handle, _token
 * Returns { job: { id, title, salary, equity, date_posted, company_handle } }
 * Throws 400 if data is invalid or company_handle doesn't exist
 */

router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const jobData = req.body;
        const validationResult = jsonschema.validate(
            jobData, jobCreateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        const job = await Job.create(jobData);
        return res.status(201).json({ job });
    } catch (e) {
        return next(e);
    }
});

/**
 * PATCH /companies/:id
 * Required fields: _token
 * Optional fields: title, salary, equity
 * Returns { job: { id, title, salary, equity, date_posted, company_handle } }
 * Throws 400 if data is invalid 
 * Throws 404 if id not found
 */

router.patch('/:id', requireAdmin, async (req, res, next) => {
    try {
        const jobData = req.body;
        const validationResult = jsonschema.validate(
            jobData, jobUpdateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        const id = req.params.id;
        const job = await Job.update(id, jobData);
        return res.json({ job });
    } catch (e) {
        return next(e);
    }
});

/**
 * DELETE /jobs/:id
 * Required fields: _token
 * Returns { message: "Job deleted" }
 * Throws 404 if id not found
 */

router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
        await Job.delete(req.params.id);
        return res.json({ message: 'Job deleted' });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;