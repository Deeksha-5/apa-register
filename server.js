const express = require('express');
const cors = require('cors');
const { BlobServiceClient } = require('@azure/storage-blob');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const path = require('path');
const { getEmailTemplate } = require('./emailTemplate');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Azure Storage Configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || 'registrations';
const EXCEL_FILE_NAME = 'physics-mock-test-registrations.xlsx';

// Initialize Azure Blob Service Client
let blobServiceClient;
let containerClient;

if (AZURE_STORAGE_CONNECTION_STRING) {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
}

// Email Configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

// Initialize Email Transporter
let transporter;
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
    
    // Verify email configuration
    transporter.verify((error, success) => {
        if (error) {
            console.error('Email configuration error:', error);
        } else {
            console.log('Email server is ready to send emails');
        }
    });
} else {
    console.log('WARNING: Email not configured. Emails will not be sent.');
}

// Ensure container exists
async function ensureContainerExists() {
    if (!containerClient) return;
    
    const exists = await containerClient.exists();
    if (!exists) {
        await containerClient.create();
        console.log(`Container "${CONTAINER_NAME}" created`);
    }
}

// Download Excel file from Azure or create new one
async function getOrCreateExcelFile() {
    const workbook = new ExcelJS.Workbook();
    
    if (!containerClient) {
        // If Azure is not configured, create new workbook
        createNewWorksheet(workbook);
        return workbook;
    }
    
    const blobClient = containerClient.getBlobClient(EXCEL_FILE_NAME);
    const exists = await blobClient.exists();
    
    if (exists) {
        // Download existing file
        const downloadResponse = await blobClient.download();
        const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
        await workbook.xlsx.load(downloaded);
    } else {
        // Create new worksheet
        createNewWorksheet(workbook);
    }
    
    return workbook;
}

// Create new worksheet with headers
function createNewWorksheet(workbook) {
    const worksheet = workbook.addWorksheet('Registrations');
    
    // Add headers
    worksheet.columns = [
        { header: 'Registration Date', key: 'date', width: 20 },
        { header: 'Payment ID', key: 'paymentId', width: 30 },
        { header: 'Student Name', key: 'fullName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Mobile', key: 'phone', width: 15 },
        { header: 'Parent Mobile', key: 'parentPhone', width: 15 },
        { header: 'Stream', key: 'stream', width: 15 },
        { header: 'School', key: 'school', width: 30 },
        { header: 'APA Student', key: 'apaStudent', width: 12 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Exam Mode', key: 'examMode', width: 12 },
        { header: 'How you get to know about us', key: 'rollNumber', width: 35 },
        { header: 'Amount Paid', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 10 }
    ];
    
    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
    };
    worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };
}

// Helper function to convert stream to buffer
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

// Upload Excel file to Azure
async function uploadExcelFile(workbook) {
    if (!containerClient) {
        // If Azure is not configured, save locally
        await workbook.xlsx.writeFile(EXCEL_FILE_NAME);
        console.log('Excel file saved locally');
        return;
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blobClient = containerClient.getBlockBlobClient(EXCEL_FILE_NAME);
    
    await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
            blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    });
    
    console.log('Excel file uploaded to Azure Storage');
}

// Send confirmation email
async function sendConfirmationEmail(registrationData) {
    if (!transporter) {
        console.log('Email not configured, skipping email send');
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
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5VNE5JlgrZGle',
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// API endpoint to get Razorpay configuration
app.get('/api/config', (req, res) => {
    res.json({
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5VNE5JlgrZGle'
    });
});

// API endpoint to create Razorpay order
app.post('/api/create-order', async (req, res) => {
    try {
        const options = {
            amount: 19900, // Amount in paise (₹199.00)
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1 // Auto-capture payment
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// API endpoint to save registration
app.post('/api/register', async (req, res) => {
    try {
        const registrationData = req.body;
        
        // Add timestamp and status
        registrationData.date = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        registrationData.status = 'Confirmed';
        registrationData.amount = registrationData.amount || 199;
        
        // Get or create Excel file
        const workbook = await getOrCreateExcelFile();
        const worksheet = workbook.getWorksheet('Registrations');
        
        // Add new row
        worksheet.addRow(registrationData);
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = column.header ? column.header.toString().length : 10;
            column.eachCell({ includeEmpty: true }, cell => {
                const cellLength = cell.value ? cell.value.toString().length : 0;
                if (cellLength > maxLength) {
                    maxLength = cellLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
        
        // Save to Azure
        await uploadExcelFile(workbook);
        
        // Send confirmation email
        const emailSent = await sendConfirmationEmail(registrationData);
        
        res.json({
            success: true,
            message: 'Registration saved successfully',
            registrationId: registrationData.paymentId,
            emailSent: emailSent
        });
        
    } catch (error) {
        console.error('Error saving registration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save registration',
            error: error.message
        });
    }
});

// API endpoint to download registrations (optional)
app.get('/api/download-registrations', async (req, res) => {
    try {
        if (!containerClient) {
            return res.status(503).json({
                success: false,
                message: 'Azure Storage not configured'
            });
        }
        
        const blobClient = containerClient.getBlobClient(EXCEL_FILE_NAME);
        const exists = await blobClient.exists();
        
        if (!exists) {
            return res.status(404).json({
                success: false,
                message: 'No registrations found'
            });
        }
        
        const downloadResponse = await blobClient.download();
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${EXCEL_FILE_NAME}"`);
        
        downloadResponse.readableStreamBody.pipe(res);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download registrations',
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    if (AZURE_STORAGE_CONNECTION_STRING) {
        await ensureContainerExists();
        console.log('Azure Storage connected');
    } else {
        console.log('WARNING: Azure Storage not configured. Data will be saved locally.');
    }
});