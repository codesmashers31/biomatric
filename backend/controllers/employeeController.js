const Employee = require('../models/Employee');
const xlsx = require('xlsx');

// Upload Employee Data
exports.uploadEmployeeData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file uploaded" });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const employees = [];

    rows.forEach((row) => {
      if (row[0] && row[1] && row[2]) {
        const employee = new Employee({
          employeeId: row[0].toString().trim(),
          emp_name: row[1].toString().trim(),
          email: row[2].toString().trim(),
        });
        employees.push(employee);
      }
    });

    await Employee.insertMany(employees);
    res.send({ message: "Employee data uploaded successfully", count: employees.length });
  } catch (error) {
    console.error("Error uploading employee data:", error);
    res.status(500).send({ error: "Server error during employee data upload." });
  }
};



// Fetch all employee data
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    res.status(500).send({ error: 'Error fetching employee data.' });
  }
};
