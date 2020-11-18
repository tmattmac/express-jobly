const express = require('express');
const ExpressError = require('../helpers/expressError');
const { requireAdmin, requireLogin } = require('../middleware/auth');
const Company = require('../models/company');

const jsonschema = require('jsonschema');
const companyCreateSchema = require('../validators/companyCreate.json');
const companyUpdateSchema = require('../validators/companyUpdate.json');

const router = express.Router();

/**
 * GET /companies
 * Request body requires _token
 * Returns { companies: [{ handle, name }...]}
 */

router.get('/', requireLogin, async (req, res, next) => {
    try {
        const params = req.query;
        const companies = await Company.getAll(params);
        return res.json({ companies });
    } catch (e) {
        return next(e);
    }
});

/**
 * GET /companies/:handle
 * Request body requires _token
 * Returns { 
 *      company: { 
 *          handle, 
 *          name,
 *          num_employees,
 *          description,
 *          logo_url,
 *          jobs: [{
 *              id,
 *              title,
 *              date_posted,
 *              salary,
 *              equity
 *          }...]
 *      }
 * }
 * Throws 404 if handle not found
 */

router.get('/:handle', requireLogin, async (req, res, next) => {
    try {
        const company = await Company.get(req.params.handle);
        return res.json({ company });
    } catch (e) {
        return next(e);
    }
});

/**
 * POST /companies
 * Required fields: handle, name, _token
 * Optional fields: num_employees, description, logo_url
 * Returns { company: { handle, name, num_employees, description, logo_url } }
 * Throws 400 if data is invalid or handle/name is taken 
 */

router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const companyData = req.body;
        const validationResult = jsonschema.validate(
            companyData, companyCreateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        const company = await Company.create(companyData);
        return res.status(201).json({ company });
    } catch (e) {
        return next(e);
    }
});

/**
 * PATCH /companies
 * Required fields: _token
 * Optional fields: handle, name, num_employees, description, logo_url
 * Returns { company: { handle, name, num_employees, description, logo_url } }
 * Throws 400 if data is invalid or handle/name is taken 
 * Throws 404 if handle not found
 */

router.patch('/:handle', requireAdmin, async (req, res, next) => {
    try {
        const companyData = req.body;
        const validationResult = jsonschema.validate(
            companyData, companyUpdateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        const handle = req.params.handle;
        const company = await Company.update(handle, companyData);
        return res.json({ company });
    } catch (e) {
        return next(e);
    }
});

/**
 * DELETE /companies/:handle
 * Required fields: _token
 * Returns { message: "Deleted company" }
 * Throws 404 if handle not found
 */

router.delete('/:handle', requireAdmin, async (req, res, next) => {
    try {
        await Company.delete(req.params.handle);
        return res.json({ message: 'Company deleted' });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;