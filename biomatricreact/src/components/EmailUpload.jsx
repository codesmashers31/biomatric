import React, { useState, useRef } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EmailUpload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const resetForm = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a file first!');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(response.data.message || 'File uploaded successfully!');
      resetForm();

      // Optional: reload page after 3 seconds
      // setTimeout(() => window.location.reload(), 3000);
    } catch (err) {
      toast.error('Error uploading file. Please try again!');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Your Email File</h2>
          <p className="text-gray-600">Select a file to upload and process the email data.</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 mb-6 ${
            file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg
              className={`w-12 h-12 ${file ? 'text-green-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <div className="text-sm text-gray-600">
              {file ? (
                <p className="font-medium text-green-600">{file.name}</p>
              ) : (
                <>
                  <p className="font-medium">Drag & drop your file here</p>
                  <p>or</p>
                  <p className="font-medium text-blue-600 hover:text-blue-800">browse files</p>
                </>
              )}
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>

        <button
          className={`w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleFileUpload}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
};

export default EmailUpload;
