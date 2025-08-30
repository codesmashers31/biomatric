const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.log('MongoDB connection error:', err);
});

// Employee model
const employeeSchema = new mongoose.Schema({
  employeeId: String,
  email: String,
});
const Employee = mongoose.model('Employee', employeeSchema);

// Add sample employee data
const addEmployee = async () => {
  const newEmployee = new Employee({
    employeeId: '1171',  // Replace with real Employee ID
    email: 'balasudhan17@gmail.com',  // Replace with real email
  });

  await newEmployee.save();
  console.log('Employee added');
};

addEmployee().catch(err => console.error(err));
