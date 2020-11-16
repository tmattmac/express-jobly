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
     *      { username, first_name, last_name, email, photo_url, is_admin }
     * @throws {ExpressError} with 400 status if username or email is taken,
     *      or if required fields are not provided
     */

    static register(userData) {

    }

    /**
     * authenticate: authenticate an existing user
     * @param {string} username
     * @param {string} password
     * @return {Object} The authenticated user:
     *      { username, first_name, last_name, email, photo_url, is_admin }
     * @throws {ExpressError} with 400 status if username is not found or
     *      password is incorrect
     */

    static authenticate(username, password) {

    }

    /**
     * get: get user by username
     * @param {string} username - the username to get by
     * @return {Object} { username, first_name, last_name, email, 
     *      photo_url, is_admin }
     * @throws {ExpressError} with 404 status if no user is found
     */

    static get(username) {

    }

    /**
     * getAll: get array of all users
     * @return {Array} [{ username, first_name, last_name, email }...]
     */

    static getAll() {

    }

    /**
     * update: update user with provided data
     * @param {string} username - Username of the user to update.
     * @param {Object} newData - Object with data to update user with. 
     *      Can update username, first_name, last_name, email, photo_url, is_admin.
     * @return {Object} the updated user:
     *      { username, first_name, last_name, email, photo_url, is_admin }
     * @throws {ExpressError} with 400 status if username or email is
     *      in use.
     */

    static update(handle, newData) {
        
    }
    
    /**
     * delete: delete user with provided username
     * @param {string} username - Username of the user to delete.
     * @return {string} The username of the deleted user.
     * @throws {ExpressError} with 404 status if no user is found.
     */
    
    static delete(id) {
        
    }
    
}

module.exports = User;