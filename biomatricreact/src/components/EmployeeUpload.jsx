import React, { useState } from 'react';
import axios from 'axios';

const EmployeeUpload = () => {
  const [file, setFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatusMessage(''); // Clear any previous message
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setStatusMessage('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setStatusMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/employee/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Show success message
      setStatusMessage(response.data.message);
      
      // Reset the file input and status after successful upload
      setFile(null);
      if (document.getElementById("file-input")) {
        document.getElementById("file-input").value = ''; // Reset the file input
      }

      // Optional: Hide the form after upload, or reload the page
      setTimeout(() => {
        // Hide the form after a few seconds (if needed)
        // window.location.reload();  // Uncomment to reload the page
      }, 3000);

    } catch (error) {
      // Show error message if something goes wrong
      setStatusMessage('Error uploading employee data.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Upload Employee Data</h2>

      <div>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md p-2 mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className={`w-full py-2 px-4 rounded-md font-semibold text-white 
            ${isUploading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isUploading ? 'Uploading...' : 'Upload Employee Data'}
        </button>
      </div>

      {statusMessage && (
        <div className={`mt-4 text-sm ${statusMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default EmployeeUpload;
