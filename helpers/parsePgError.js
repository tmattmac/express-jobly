/** 
 * parsePgError takes a Postgres error with a unique key violation
 * and returns the name of the column the violation occurred at
 */

function parsePgError(err) {
    // get values between parentheses
    console.log(err.detail);
    const matches = /\(([^)]+)\)/.exec(err.detail || '');
    console.log(matches);
    return matches[1];
}

module.exports = parsePgError;