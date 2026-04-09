const history = [
  {
    "_id": "69d3311a431af3045ac5bc5d",
    "employeeId": "KCN_SLM",
    "date": "2026-04-06",
    "checkInTime": "2026-04-06T04:05:44.949Z",
    "checkOutTime": "2026-04-06T12:37:09.884Z"
  },
  {
    "_id": "69d484912c5af7c22c71a3a8",
    "employeeId": "KCN_SLM",
    "date": "2026-04-07",
    "checkInTime": "2026-04-07T04:14:09.609Z",
    "checkOutTime": "2026-04-07T12:29:38.006Z"
  },
  {
    "_id": "69d5dc9cb8f6481a14a9c537",
    "employeeId": "KCN_SLM",
    "date": "2026-04-08",
    "checkInTime": "2026-04-08T04:42:04.404Z",
  },
  {
    "_id": "69d7e465bf05e1a329b7a269",
    "employeeId": "KCN_SLM",
    "date": "2026-04-09",
    "checkInTime": "2026-04-09T17:39:49.421Z",
    "checkOutTime": "2026-04-09T17:39:52.581Z"
  }
];

const targetMonth = "2026-04";
let totalHourly = 0;
let absoluteTotalHours = 0;

history.forEach(r => {
  if (r.checkInTime) {
    const start = new Date(r.checkInTime);
    let end = r.checkOutTime ? new Date(r.checkOutTime) : new Date();
    
    const sixPM = new Date(start);
    sixPM.setHours(18, 0, 0, 0);
    if (end > sixPM) end = sixPM;

    let diff = 0;
    if (end > start) {
      diff = (end - start) / (1000 * 60 * 60);
    }

    const roundedDiff = Math.abs(Math.round(diff * 100) / 100);
    absoluteTotalHours += roundedDiff;
    totalHourly += Math.abs(Math.round(roundedDiff * 41.5 * 100) / 100);
    console.log(`Record ${r.date}: diff = ${diff}, rounded = ${roundedDiff}, salary = ${Math.abs(Math.round(roundedDiff * 41.5 * 100) / 100)}`);
  }
});

console.log(`Total Hours: ${absoluteTotalHours.toFixed(2)}, Salary: ${totalHourly.toFixed(2)}`);
