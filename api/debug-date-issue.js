// Debug script to test Date constructor behavior
console.log('Testing Date constructor with various inputs:');

console.log('new Date(null):', new Date(null));
console.log('new Date(undefined):', new Date(undefined)); 
console.log('new Date(""):', new Date(""));
console.log('new Date(0):', new Date(0));

console.log('\nTesting undefined map.get():');
const map = new Map();
map.set(1, new Date('2024-01-01'));
console.log('map.get(1):', map.get(1));
console.log('map.get(2):', map.get(2)); // undefined
console.log('new Date(map.get(2)):', new Date(map.get(2))); // should be 1970

console.log('\nTesting falsy check behavior:');
console.log('null ? "truthy" : "falsy":', null ? "truthy" : "falsy");
console.log('undefined ? "truthy" : "falsy":', undefined ? "truthy" : "falsy");
console.log('new Date(null) ? "truthy" : "falsy":', new Date(null) ? "truthy" : "falsy");
console.log('new Date(undefined) ? "truthy" : "falsy":', new Date(undefined) ? "truthy" : "falsy");