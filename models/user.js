const db = require('../db');
const ExpressError = require('../helpers/expressError');
const sqlForPartialUpdate = require('../helpers/partialUpdate');
const bcrypt = require('bcrypt');
const { BCRYPT_HASHING_ROUNDS } = require('../config');

/**
 * Class for database operations related to users.
 */

class User {

    /**
     * register: register a new user
     * @param {Object} userData - Object with user data.
     *      Required fields: username, password, first_name, last_name, email.
     *      Optional fields: photo_url.
     * @return {Object} The newly registered user:
     *      { username, is_admin }
     * @throws {ExpressError} with 400 status if username or email is taken,
     *      or if required fields are not provided
     */

    static async register(userData) {
        const query = `
            INSERT INTO users 
                (username, password, first_name, last_name, email, photo_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING 
                username, is_admin
        `;
        const hashedPassword = await bcrypt.hash(
            userData.password, BCRYPT_HASHING_ROUNDS
        );
        const values = [
            userData.username,
            hashedPassword,
            userData.first_name,
            userData.last_name,
            userData.email,
            userData.photo_url
        ];

        try {
            const { rows: [user] } = await db.query(query, values);
            return user;
        } catch (e) {
            if (e.code === '23505') { // unique key violation
                this.handleUniqueKeyViolation(e, userData);
            }
            throw e;
        }


    }

    /**
     * authenticate: authenticate an existing user
     * @param {string} username
     * @param {string} password
     * @return {Object} The authenticated user:
     *      { username, is_admin }
     * @throws {ExpressError} with 400 status if username is not found or
     *      password is incorrect
     */

    static authenticate(username, password) {
        const query = `
            SELECT username, password, is_admin
            FROM users
            WHERE username = $1
        `;
        
        const { rows: [user] } = db.query(query, [username]);
        if (user && await bcrypt.compare(password, user.password)) {
            delete user.password;
            return user;
        }

        const errorMsg = 'Could not log in with provided credentials';
        throw new ExpressError(errorMsg, 400);
    }

    /**
     * get: get user by username
     * @param {string} username - the username to get by
     * @return {Object} { username, first_name, last_name, email, 
     *      photo_url, is_admin }
     * @throws {ExpressError} with 404 status if no user is found
     */

    static get(username) {
        const query = `
            SELECT username, first_name, last_name, email, photo_url, is_admin
            FROM users
            WHERE username = $1
        `;

        const { rows: [user] } = await db.query(query, [username]);

        if (!user) {
            throw new ExpressError(`User ${username} not found`, 404);
        }

        return user;
    }

    /**
     * getAll: get array of all users
     * @return {Array} [{ username, first_name, last_name, email }...]
     */

    static getAll() {
        const query = `
            SELECT username, first_name, last_name, email
            FROM users
        `;

        const rows = await db.query(query);
        return rows;
    }

    /**
     * update: update user with provided data
     * @param {string} username - Username of the user to update.
     * @param {Object} newData - Object with data to update user with. 
     *      Can update username, first_name, last_name, email, 
     *      photo_url, is_admin.
     * @return {Object} the updated user:
     *      { username, first_name, last_name, email, photo_url, is_admin }
     * @throws {ExpressError} with 400 status if username or email is
     *      in use.
     */

    static update(username, newData) {
        const { query, values } = sqlForPartialUpdate(
            'users', newData, 'username', username
        );

        try {
            const { rows: [user] } = await db.query(query, values);
            if (!user) {
                throw new ExpressError(`User '${username}' not found`, 404);
            }
            return user;
        } catch (e) {
            if (e.code === '23505') { // unique key violation
                this.handleUniqueKeyViolation(e, newData);
            }
            throw e;
        }
    }
    
    /**
     * delete: delete user with provided username
     * @param {string} username - Username of the user to delete.
     * @return {string} The username of the deleted user.
     * @throws {ExpressError} with 404 status if no user is found.
     */
    
    static delete(username) {
        const query = `
            DELETE FROM users WHERE username = $1 RETURNING username
        `;
        const { rows: [user] } = await db.query(query, [username]);
        if (!user) {
            throw new ExpressError(`User '${username}' not found`, 404);
        }
        return user;
    }
    
    /**
     * Throws an error with a human-readable message for unique key violations
     */
    static handleUniqueKeyViolation(err, data) {
        const key = parsePgError(err);
        let errorMsg;
        if (key === 'username') {
            errorMsg = `Username '${data.username}' taken`
        }
        else if (key === 'email') {
            errorMsg = `Email '${data.email}' taken`
        }
        throw new ExpressError(errorMsg, 400);
    }
}

module.exports = User;