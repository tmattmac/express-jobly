const sqlForPartialUpdate = require("../../helpers/partialUpdate");

describe("partialUpdate()", () => {
  test("should generate a proper partial update query with just 1 field",
    function () {

      const { query, values } = sqlForPartialUpdate(
        'test_table',
        { c1: 'val1' },
        'id',
        1
      );

      expect(query).toBe(
        'UPDATE test_table SET c1=$1 WHERE id=$2 RETURNING *'
      );
      expect(values).toEqual(['val1', 1]);
  });
  
  test("should generate a proper partial update query with multiple fields",
    function () {

      const { query, values } = sqlForPartialUpdate(
        'test_table',
        {
          c1: 'val1',
          c2: 'val2',
          c3: 3
        },
        'id',
        1
      );

      expect(query).toBe(
        'UPDATE test_table SET c1=$1, c2=$2, c3=$3 WHERE id=$4 RETURNING *'
      );
      expect(values).toEqual(['val1', 'val2', 3, 1]);
    });
  
  test("should ignore fields prefixed with underscores",
    function () {

      const { query, values } = sqlForPartialUpdate(
        'test_table',
        {
          c1: 'val1',
          c2: 'val2',
          _c3: 'should not appear'
        },
        'id',
        1
      );

      expect(query).toBe(
        'UPDATE test_table SET c1=$1, c2=$2 WHERE id=$3 RETURNING *'
      );
      expect(values).toEqual(['val1', 'val2', 1]);
  });
  
});
