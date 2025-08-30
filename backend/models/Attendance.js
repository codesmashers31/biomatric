const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  attendanceDate: { type: Date, required: true },
  punchRecords: { type: String, required: true }, // You can store detailed punch in/out data here
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
