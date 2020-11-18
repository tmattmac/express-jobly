const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

function createJWT(user) {
    const { username, is_admin } = user;
    return jwt.sign({ username, is_admin }, SECRET_KEY);
}

module.exports = createJWT;