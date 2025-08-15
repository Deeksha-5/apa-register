function getEmailTemplate(studentData) {
    const examDate = '28th September 2025';
    const OfflineExamTime = '11:30 AM - 2:30 PM';
    const OnlineExamTime = '12:00 PM - 3:00 PM';
    
    const isOfflineMode = studentData.examMode === 'offline';
    const examTime = isOfflineMode ? OfflineExamTime : OnlineExamTime;
    const examModeText = isOfflineMode ? 'Offline (At Center)' : 'Online (From Home)';
    
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
            <tr><td>Exam Mode:</td><td>${examModeText}</td></tr>
            <tr><td>Amount Paid:</td><td>₹${studentData.amount}</td></tr>
        </table>
        
        <div class="exam-info">
            <h3>Exam Details</h3>
            <p><strong>Date:</strong> ${examDate}</p>
            <p><strong>Time:</strong> ${examTime}</p>
            <p><strong>Duration:</strong> 3 Hours</p>
            <p><strong>Total Marks:</strong> 70 Marks</p>
            <p><strong>Mode:</strong> ${examModeText}</p>
        </div>
        
        <div class="important-notes">
            <h3>Important Instructions</h3>
            <ul>
                ${isOfflineMode ? `
                    <li>Please arrive at the exam center 30 minutes before the scheduled time</li>
                    <li>Admit Card will be sent to you 48 hours before the Exam date</li>
                    <li>Bring a valid ID proof (Aadhaar, School ID, etc.) and the Admit card on Exam day</li>
                    <li>Use of electronic devices (phones, smartwatches) is strictly prohibited</li>
                    <li>Only pen/pencil and eraser are allowed inside the exam hall</li>
                    <li>Calculator is not allowed</li>
                    <li>Rough sheets will be provided at the exam center</li>
                    <li>Results will be declared within 2 weeks</li>
                ` : `
                    <li>Join the exam 15 minutes before the scheduled time using the exam link</li>
                    <li>Exam link and instructions will be sent to you 2 hours before the Exam date</li>
                    <li>Ensure stable internet connection</li>
                    <li>Use a laptop/desktop with webcam and microphone for proctoring</li>
                    <li>Keep a valid ID proof ready for verification during the exam</li>
                    <li>Calculator is not allowed - use only pen/paper for calculations</li>
                    <li>Ensure quiet environment without any disturbances</li>
                    <li>Results will be declared within 2 weeks</li>
                `}
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

module.exports = { getEmailTemplate };