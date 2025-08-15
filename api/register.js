const { BlobServiceClient } = require('@azure/storage-blob');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');

// Import email template (Vercel requires relative path)
function getEmailTemplate(studentData) {
    const examDate = '28th September 2025';
    const examTime = '10:00 AM - 1:00 PM';
    
    return {
        subject: 'Registration Confirmed - Class 12 Physics Mock Test | Aakansh Physics Academy',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .confirmation-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
        .confirmation-box h2 { color: #059669; margin-top: 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .details-table td:first-child { font-weight: bold; color: #6b7280; width: 40%; }
        .exam-info { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
        .exam-info h3 { margin-top: 0; color: #1e40af; }
        .important-notes { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .important-notes h3 { margin-top: 0; color: #d97706; }
        .important-notes ul { margin: 10px 0; padding-left: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Aakansh Physics Academy</h1>
        <p>Transforming Potential into Achievement</p>
    </div>
    
    <div class="content">
        <div class="confirmation-box">
            <h2>✓ Registration Confirmed!</h2>
            <p>Dear ${studentData.fullName},</p>
            <p>Your registration for the <strong>Class 12 Physics Mock Test</strong> has been successfully confirmed.</p>
        </div>
        
        <table class="details-table">
            <tr><td>Registration ID:</td><td>${studentData.paymentId}</td></tr>
            <tr><td>Student Name:</td><td>${studentData.fullName}</td></tr>
            <tr><td>Email:</td><td>${studentData.email}</td></tr>
            <tr><td>Mobile:</td><td>${studentData.phone}</td></tr>
            <tr><td>School:</td><td>${studentData.school}</td></tr>
            <tr><td>Stream:</td><td>${studentData.stream.toUpperCase()}</td></tr>
            <tr><td>Amount Paid:</td><td>₹${studentData.amount}</td></tr>
        </table>
        
        <div class="exam-info">
            <h3>Exam Details</h3>
            <p><strong>Date:</strong> ${examDate}</p>
            <p><strong>Time:</strong> ${examTime}</p>
            <p><strong>Duration:</strong> 3 Hours</p>
            <p><strong>Total Marks:</strong> 70 Marks</p>
            <p><strong>Mode:</strong> Offline</p>
        </div>
        
        <div class="important-notes">
            <h3>Important Instructions</h3>
            <ul>
                <li>Please arrive at the exam center 15 minutes before the scheduled time</li>
                <li>Bring your registration ID and a valid photo ID</li>
                <li>Calculator is allowed (Scientific calculator only)</li>
                <li>Rough sheets will be provided at the exam center</li>
                <li>Results will be declared within 24 hours</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px;">If you have any queries, please contact us at support@aakansphysics.com</p>
    </div>
    
    <div class="footer">
        <p>&copy; 2025 Aakansh Physics Academy. All rights reserved.</p>
    </div>
</body>
</html>
        `,
        text: `Registration Confirmed - Class 12 Physics Mock Test

Dear ${studentData.fullName},

Your registration has been confirmed.

Registration ID: ${studentData.paymentId}
Amount Paid: ₹${studentData.amount}
Exam Date: ${examDate}

Contact: support@aakansphysics.com

Best wishes!
Aakansh Physics Academy`
    };
}

// Environment variables
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'registrations';
const EXCEL_FILE_NAME = 'physics-mock-test-registrations.xlsx';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

// Initialize clients
let blobServiceClient;
let containerClient;
let transporter;

if (AZURE_STORAGE_CONNECTION_STRING) {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
}

if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransporter({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT == 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
}

// Helper functions
async function ensureContainerExists() {
    if (!containerClient) return;
    const exists = await containerClient.exists();
    if (!exists) {
        await containerClient.create();
    }
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

async function getOrCreateExcelFile() {
    const workbook = new ExcelJS.Workbook();
    
    if (!containerClient) {
        createNewWorksheet(workbook);
        return workbook;
    }
    
    await ensureContainerExists();
    const blobClient = containerClient.getBlobClient(EXCEL_FILE_NAME);
    const exists = await blobClient.exists();
    
    if (exists) {
        const downloadResponse = await blobClient.download();
        const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
        await workbook.xlsx.load(downloaded);
    } else {
        createNewWorksheet(workbook);
    }
    
    return workbook;
}

function createNewWorksheet(workbook) {
    const worksheet = workbook.addWorksheet('Registrations');
    
    worksheet.columns = [
        { header: 'Registration Date', key: 'date', width: 20 },
        { header: 'Payment ID', key: 'paymentId', width: 30 },
        { header: 'Student Name', key: 'fullName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Mobile', key: 'phone', width: 15 },
        { header: 'Parent Mobile', key: 'parentPhone', width: 15 },
        { header: 'Stream', key: 'stream', width: 15 },
        { header: 'School', key: 'school', width: 30 },
        { header: 'Board', key: 'board', width: 10 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'How you get to know about us', key: 'rollNumber', width: 35 },
        { header: 'Amount Paid', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 10 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
}

async function uploadExcelFile(workbook) {
    if (!containerClient) {
        console.log('Azure not configured, skipping upload');
        return;
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blobClient = containerClient.getBlockBlobClient(EXCEL_FILE_NAME);
    
    await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
            blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    });
}

async function sendConfirmationEmail(registrationData) {
    if (!transporter) {
        console.log('Email not configured');
        return false;
    }
    
    try {
        const emailTemplate = getEmailTemplate(registrationData);
        
        const mailOptions = {
            from: `"Aakansh Physics Academy" <${EMAIL_FROM}>`,
            to: registrationData.email,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html
        };
        
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

// Main handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const registrationData = req.body;
        
        // Add metadata
        registrationData.date = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        registrationData.status = 'Confirmed';
        registrationData.amount = registrationData.amount || 199;
        
        // Get Excel file
        const workbook = await getOrCreateExcelFile();
        const worksheet = workbook.getWorksheet('Registrations');
        
        // Add row
        worksheet.addRow(registrationData);
        
        // Save to Azure
        await uploadExcelFile(workbook);
        
        // Send email
        const emailSent = await sendConfirmationEmail(registrationData);
        
        res.json({
            success: true,
            message: 'Registration saved successfully',
            registrationId: registrationData.paymentId,
            emailSent: emailSent
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save registration',
            error: error.message
        });
    }
};