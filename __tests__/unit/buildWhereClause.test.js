const buildWhereClause = require("../../helpers/buildWhereClause");

const conditionMap = {
    search: ['name', 'ILIKE'],
    min_employees: ['num_employees', '>='],
    max_employees: ['num_employees', '<=']
}

describe("buildWhereClause()", () => {
  test("should generate a WHERE clause with one condition", () => {

    const { clause, values } = buildWhereClause({
      min_employees: 50
    }, conditionMap);

    expect(clause).toBe('WHERE num_employees >= $1')
    expect(values).toEqual([50]);
  });

  test("should wrap ILIKE conditions in percent signs", () => {

    const { clause, values } = buildWhereClause({
      search: 'Test Company'
    }, conditionMap);

    expect(clause).toBe('WHERE name ILIKE $1')
    expect(values).toEqual(['%Test Company%']);
  });

  test("should generate WHERE clause with multiple conditions", () => {

    const { clause, values } = buildWhereClause({
      search: 'Test Company',
      min_employees: 50,
      max_employees: 100,
    }, conditionMap);

    // I wish I knew regex...
    expect(clause).toEqual(expect.stringContaining('name ILIKE'));
    expect(clause).toEqual(expect.stringContaining('num_employees <='));
    expect(clause).toEqual(expect.stringContaining('num_employees >='));
    expect(clause).toEqual(expect.stringContaining('$1'));
    expect(clause).toEqual(expect.stringContaining('$2'));
    expect(clause).toEqual(expect.stringContaining('$3'));

    expect(values).toEqual(
      expect.arrayContaining(['%Test Company%', 50, 100])
    );
  });

  test("should generate clause without non-matching conditions", () => {

    const { clause, values } = buildWhereClause({
      min_employees: 50,
      description: 'technology'
    }, conditionMap);

    expect(clause).toBe('WHERE num_employees >= $1')
    expect(values).toEqual([50]);
  });

  test("should return empty clause with no conditions", () => {

    const { clause, values } = buildWhereClause({}, conditionMap);

    expect(clause).toBe('')
    expect(values).toEqual([]);
  });

  test("should return empty clause with no matching conditions", () => {

    const { clause, values } = buildWhereClause({
      description: 'technology'
    }, conditionMap);

    expect(clause).toBe('')
    expect(values).toEqual([]);
  });
});
