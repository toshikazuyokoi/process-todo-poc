// Comprehensive test of all the problematic values that could cause 1970 dates

console.log('=== Testing DueDate constructor behavior ===');

class DueDate {
  constructor(date) {
    this.date = new Date(date);
    if (isNaN(this.date.getTime())) {
      throw new Error('Invalid date');
    }
  }
  
  getDate() {
    return new Date(this.date);
  }
  
  toISOString() {
    return this.date.toISOString();
  }
}

const testValues = [
  null,
  undefined,
  '',
  '0',
  0,
  '1970-01-01',
  'invalid-date',
  false,
  true,
  {},
  [],
  'null',
  'undefined'
];

console.log('\nTesting DueDate constructor:');
testValues.forEach(value => {
  try {
    const dueDate = new DueDate(value);
    console.log(`DueDate(${JSON.stringify(value)}): ${dueDate.toISOString()}`);
  } catch (e) {
    console.log(`DueDate(${JSON.stringify(value)}): ERROR - ${e.message}`);
  }
});

console.log('\n=== Testing StepInstance constructor logic ===');

const simulateStepInstanceConstructor = (dueDateUtc) => {
  console.log(`\nInput: ${JSON.stringify(dueDateUtc)}`);
  console.log(`Truthiness: ${dueDateUtc ? "truthy" : "falsy"}`);
  
  let result;
  if (dueDateUtc) {
    try {
      result = new DueDate(dueDateUtc);
      console.log(`Result: DueDate -> ${result.toISOString()}`);
      return result;
    } catch (e) {
      console.log(`Result: ERROR - ${e.message}`);
      return null;
    }
  } else {
    console.log(`Result: null`);
    return null;
  }
};

testValues.forEach(simulateStepInstanceConstructor);

console.log('\n=== Testing JSON parsing scenarios ===');

// Test what happens if dates come from JSON parsing
const jsonTests = [
  '{"dueDateUtc": null}',
  '{"dueDateUtc": ""}',
  '{"dueDateUtc": "1970-01-01T00:00:00.000Z"}',
  '{"dueDateUtc": 0}',
  '{"dueDateUtc": "invalid"}',
];

jsonTests.forEach(json => {
  try {
    const parsed = JSON.parse(json);
    console.log(`JSON: ${json} -> dueDateUtc: ${JSON.stringify(parsed.dueDateUtc)}`);
    simulateStepInstanceConstructor(parsed.dueDateUtc);
  } catch (e) {
    console.log(`JSON: ${json} -> ERROR: ${e.message}`);
  }
});