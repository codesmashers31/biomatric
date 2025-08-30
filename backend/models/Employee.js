const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  emp_name: { type: String, required: true },
  email: { type: String, required: true },
});

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;
