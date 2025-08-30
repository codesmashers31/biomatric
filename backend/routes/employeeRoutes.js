const express = require('express');
const multer = require('multer');
const Employee = require('../models/Employee'); // Assuming Employee schema is defined in models/Employee.js
const router = express.Router();

// Set up file upload with multer
const upload = multer({ dest: 'uploads/' });

// Route to upload employee data
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }

    // You can process the Excel file here
    // Process the file and insert data into MongoDB
    const employeeData = processEmployeeFile(req.file); // Assuming a function to process file data

    // Insert the data into MongoDB (example)
    for (const employee of employeeData) {
      const newEmployee = new Employee(employee);
      await newEmployee.save();
    }

    res.send({ message: "Employee data uploaded and saved successfully" });
  } catch (error) {
    console.error("Error uploading employee data:", error);
    res.status(500).send({ error: "Error processing file" });
  }
});

// Route to get all employees (for the frontend to fetch employee data)
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).send({ error: "Error fetching employee data" });
  }
});

module.exports = router;
