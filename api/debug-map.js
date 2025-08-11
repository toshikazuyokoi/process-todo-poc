// Test to reproduce the stepSchedules.get issue
const map = new Map();
map.set(1, new Date('2024-01-01'));
map.set(2, new Date('2024-01-02'));

console.log('map contents:', [...map.entries()]);

// Simulate the scenario
const templateIds = [1, 2, 3]; // 3 doesn't exist in map
const steps = templateIds.map((id) => ({
  templateId: id,
  dueDateUtc: map.get(id), // This will be undefined for id=3
}));

console.log('steps:', steps);

// What happens when we pass undefined to Date constructor via dueDateUtc check?
const simulateStepInstanceConstructor = (dueDateUtc) => {
  console.log(`dueDateUtc: ${dueDateUtc}`);
  console.log(`dueDateUtc ? "truthy" : "falsy": ${dueDateUtc ? "truthy" : "falsy"}`);
  
  if (dueDateUtc) {
    return new Date(dueDateUtc);
  } else {
    return null;
  }
};

steps.forEach(step => {
  console.log(`\nTemplate ${step.templateId}:`);
  const result = simulateStepInstanceConstructor(step.dueDateUtc);
  console.log(`Result: ${result}`);
});