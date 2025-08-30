import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeData = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('http://localhost:5000/employee');
        setEmployees(response.data);
      } catch (error) {
        console.error('Error fetching employee data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Employee Data</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
          <thead>
            <tr>
              <th className="py-2 px-4 text-left">Emp Code</th>
              <th className="py-2 px-4 text-left">Employee Name</th>
              <th className="py-2 px-4 text-left">Email</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.employeeId} className="border-t">
                <td className="py-2 px-4">{employee.employeeId}</td>
                <td className="py-2 px-4">{employee.emp_name}</td>
                <td className="py-2 px-4">{employee.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeeData;
