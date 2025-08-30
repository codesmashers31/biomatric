import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import EmployeeUpload from "./components/EmployeeUpload";
import EmployeeData from "./components/EmployeeData";
import EmailUpload from "./components/EmailUpload";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-blue-600 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-white font-bold text-xl">Employee Management</h1>
            <div>
              <Link to="/" className="text-white mx-4 hover:text-gray-300">Home</Link>
              <Link to="/upload" className="text-white mx-4 hover:text-gray-300">Upload Employee Data</Link>
              <Link to="/employees" className="text-white mx-4 hover:text-gray-300">Employee Data</Link>
              <Link to="/email-upload" className="text-white mx-4 hover:text-gray-300">Upload Email</Link>
            </div>
          </div>
        </nav>

        <div className="p-8">
          <Routes>
            <Route exact path="/" element={<h2 className="text-center text-3xl">Welcome to the Employee Management System</h2>} />
            <Route path="/upload" element={<EmployeeUpload />} />
            <Route path="/employees" element={<EmployeeData />} />
            <Route path="/email-upload" element={<EmailUpload />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
