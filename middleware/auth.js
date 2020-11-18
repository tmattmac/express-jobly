const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');
const ExpressError = require('../helpers/expressError');

function addUserToRequest(req, res, next) {
    try {
        const token = req.body._token;
        if (!token) return next();
        const { username, is_admin } = jwt.verify(token, SECRET_KEY);
        req.username = username;
        req.is_admin = is_admin;
        return next();
    } catch (e) {
        return next(e);
    }
}

function requireLogin(req, res, next) {
    if (req.username) {
        return next()
    }
    return next(new ExpressError('Not authorized', 401));
}

function requireAdmin(req, res, next) {
    if (req.is_admin) {
        return next()
    }
    return next(new ExpressError('Not authorized', 401));
}

module.exports = { requireLogin, requireAdmin, addUserToRequest }