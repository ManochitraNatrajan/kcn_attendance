const diffMs = 1000 * 60 * 100; // 1 hour 40 minutes

const actualMinutes = Math.floor(diffMs / (1000 * 60)); // 100
const baseHours = Math.floor(actualMinutes / 60); // 1
const remainder = actualMinutes % 60; // 40

let fraction = 0.00;
if (remainder <= 14) fraction = 0.00;
else if (remainder <= 29) fraction = 0.15;
else if (remainder <= 44) fraction = 0.30;
else fraction = 0.45;
                             
const roundedHrs = baseHours + fraction; // 1.30

const sal = Math.round(roundedHrs * 41.5 * 100) / 100;

console.log(`${baseHours}h ${remainder}m -> ${roundedHrs.toFixed(2)} Hrs -> Rs. ${sal}`);
