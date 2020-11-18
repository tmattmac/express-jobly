const express = require('express');
const ExpressError = require('../helpers/expressError');
const createJWT = require('../helpers/createJWT')
const { requireAdmin, requireLogin } = require('../middleware/auth');
const User = require('../models/user');

const jsonschema = require('jsonschema');
const userCreateSchema = require('../validators/userCreate.json');
const userUpdateSchema = require('../validators/userUpdate.json');

const router = express.Router();

/**
 * POST /users - register new user
 * Required fields: username, password, first_name, last_name, email
 * Optional fields: photo_url
 * Returns { token, message: "Registered successfully" }
 * Throws 400 if data is invalid or username is taken
 */

router.post('/', async (req, res, next) => {
    try {
        // TODO: Proper email validation
        const userData = req.body;
        const validationResult = jsonschema.validate(
            userData, userCreateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        const user = await User.register(userData);
        const token = createJWT(user);
        return res.status(201).json({
            token,
            message: 'Registered successfully'
        });
    } catch (e) {
        return next(e);
    }
});

/**
 * POST /users/login - login user
 * Required fields: username, password
 * Returns { token, message: "Logged in successfully" }
 * Throws 400 if unable to log in with credentials
 */

router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new ExpressError('Username and password required', 400);
        }
        const user = await User.authenticate(username, password);
        const token = createJWT(user);
        return res.json({ token, message: 'Logged in successfully' });
    } catch (e) {
        return next(e);
    }

});

/**
 * GET /users
 * Request body requires _token
 * Returns { users: [{ username, first_name, last_name, email }...]}
 */

router.get('/', requireLogin, async (req, res, next) => {
    try {
        const users = await User.getAll();
        return res.json({ users });
    } catch (e) {
        return next(e);
    }
});

/**
 * GET /users/:username
 * Request body requires _token
 * Returns { 
 *      user: { 
 *          username,
 *          first_name,
 *          last_name,
 *          email,
 *          photo_url
 *      }
 * }
 * Throws 404 if username not found
 */

router.get('/:username', requireLogin, async (req, res, next) => {
    try {
        const user = await User.get(req.params.username);
        return res.json({ user });
    } catch (e) {
        return next(e);
    }
});

/**
 * PATCH /users/:username
 * Required fields: _token
 * Optional fields: username, first_name, last_name, email, photo_url
 * Returns { 
 *      user: { 
 *          username, first_name, last_name, email, photo_url, is_admin 
 *          } 
 *      }
 * Throws 400 if data is invalid or username doesn't match logged in user
 * Throws 404 if username not found
 */

router.patch('/:username', requireLogin, async (req, res, next) => {
    try {
        if (req.username !== req.params.username && !req.is_admin) {
            throw new ExpressError(`Not authorized`, 401);
        }

        const userData = req.body;
        const validationResult = jsonschema.validate(
            userData, userUpdateSchema);
        if (!validationResult.valid) {
            // grab the first validation error
            // TODO: More user-friendly error messages
            const errorMsg = validationResult.errors[0].stack;
            const error = new ExpressError(errorMsg, 400);
            return next(error);
        }

        // ideally there'd be some more robust mechanism for promoting admins
        // but for now, the JSON validator won't allow is_admin

        const username = req.params.username;
        const user = await User.update(username, userData);

        // issue a new token if username is updated
        if (userData.username && userData.username !== username) {
            const token = createJWT(user);
            return res.json({ user, token });
        }

        return res.json({ user });
    } catch (e) {
        return next(e);
    }
});

/**
 * DELETE /users/:username
 * Required fields: _token
 * Returns { message: "User deleted" }
 * Throws 400 if username does not match logged in user
 */

router.delete('/:username', requireLogin, async (req, res, next) => {
    try {
        if (req.username !== req.params.username && !req.is_admin) {
            throw new ExpressError(`Not authorized`, 401);
        }
        await User.delete(req.params.username);
        return res.json({ message: 'User deleted' });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;