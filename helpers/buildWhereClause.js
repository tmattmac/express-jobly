/**
 * Generate the WHERE clause for a SELECT statement with given arguments.
 * @param {Object} params - object containing conditional parameters
 * @param {Object} conditionMap - object representing a mapping from a
 *      conditional parameter to the column and condition it should be
 *      mapped to. For example, { min_employees: ['num_employees', '>='] } 
 *      will add the condition 'num_employees >= min_employees' if 
 *      min_employees is in the params map.
 * @returns {Object} { whereClause: string, items: Array }
 */

function buildWhereClause(params, conditionMap) {
    let idx = 1;
    const conditions = [];
    const values = [];
    for (let [key, value] of Object.entries(params)) {
        if (conditionMap[key]) {
            // add condition to array with value of current index
            let condition = conditionMap[key].join(' ');
            condition += ` $${idx++}`;
            conditions.push(condition);

            // wrap value in percent signs if condition is like or ilike
            if (conditionMap[key][1].toLowerCase() === 'ilike' ||
                conditionMap[key][1].toLowerCase() === 'like') {
                values.push(`%${value}%`);
            }
            else {
                values.push(value);
            }
        }
    }

    if (conditions.length === 0) {
        return { clause: '', values };
    }

    // build clause by joining conditions with AND
    const clause = `WHERE ${conditions.join(' AND ')}`;
    return { clause, values };
}

module.exports = buildWhereClause;