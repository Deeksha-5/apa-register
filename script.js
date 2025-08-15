// Razorpay Test Key - Replace with your actual test key
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID

// API endpoint - change based on deployment
const API_ENDPOINT = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api/register' 
    : '/api/register';

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const payButton = document.getElementById('payButton');
    const paymentStatus = document.getElementById('paymentStatus');
    
    // Form validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearErrors();
        
        // Validate form
        if (validateForm()) {
            // Proceed to payment
            initiatePayment();
        }
    });
    
    function validateForm() {
        let isValid = true;
        
        // Required fields
        const requiredFields = [
            'fullName', 'email', 'phone', 'stream', 
            'school', 'apaStudent', 'city', 'examMode'
        ];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                showError(field, 'This field is required');
                isValid = false;
            }
        });
        
        // Email validation
        const email = document.getElementById('email');
        if (email.value && !isValidEmail(email.value)) {
            showError(email, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Phone validation
        const phone = document.getElementById('phone');
        if (phone.value && !isValidPhone(phone.value)) {
            showError(phone, 'Please enter a valid 10-digit mobile number');
            isValid = false;
        }
        
        // Parent phone validation (if provided)
        const parentPhone = document.getElementById('parentPhone');
        if (parentPhone.value && !isValidPhone(parentPhone.value)) {
            showError(parentPhone, 'Please enter a valid 10-digit mobile number');
            isValid = false;
        }
        
        return isValid;
    }
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function isValidPhone(phone) {
        const re = /^[0-9]{10}$/;
        return re.test(phone);
    }
    
    function showError(field, message) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
    }
    
    function clearErrors() {
        document.querySelectorAll('.error').forEach(el => {
            if (el.tagName === 'DIV') {
                el.remove();
            } else {
                el.classList.remove('error');
            }
        });
    }
    
    function getFormData() {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    function initiatePayment() {
        const formData = getFormData();
        
        // Disable button
        payButton.disabled = true;
        payButton.innerHTML = '<span class="loading"></span> Processing...';
        
        // Razorpay options
        const options = {
            key: RAZORPAY_KEY_ID,
            amount: 19900, // Amount in paise (₹199.00)
            currency: 'INR',
            name: 'Aakansh Physics Academy',
            description: 'Class 12 Physics Mock Test Registration',
            image: 'logo.png', // Optional: Add your logo
            prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone
            },
            notes: {
                studentName: formData.fullName,
                school: formData.school,
                stream: formData.stream
            },
            theme: {
                color: '#1e3a8a'
            },
            handler: function(response) {
                // Payment successful
                handlePaymentSuccess(response, formData);
            },
            modal: {
                ondismiss: function() {
                    // Payment cancelled
                    payButton.disabled = false;
                    payButton.innerHTML = 'Proceed to Payment';
                    showStatus('Payment cancelled. Please try again.', 'info');
                }
            }
        };
        
        // Check if Razorpay is loaded
        if (typeof Razorpay === 'undefined') {
            payButton.disabled = false;
            payButton.innerHTML = 'Proceed to Payment';
            showStatus('Payment gateway not loaded. Please refresh the page and try again.', 'error');
            return;
        }
        
        // Open Razorpay checkout
        const razorpay = new Razorpay(options);
        razorpay.on('payment.failed', function(response) {
            handlePaymentFailure(response);
        });
        razorpay.open();
    }
    
    function handlePaymentSuccess(response, formData) {
        // Add payment details to form data
        formData.paymentId = response.razorpay_payment_id;
        formData.amount = 199;
        formData.paymentStatus = 'success';
        
        // Show processing message
        payButton.innerHTML = '<span class="loading"></span> Saving registration...';
        showStatus('Payment successful! Saving your registration...', 'info');
        
        // Send data to server
        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Success
                payButton.disabled = true;
                payButton.innerHTML = '✓ Registration Complete';
                showStatus(
                    `Registration successful! Your Registration ID is: ${formData.paymentId}. 
                    ${data.emailSent ? 'A confirmation email has been sent to your registered email address.' : 'Please save your registration ID for future reference.'}`, 
                    'success'
                );
                
                // Reset form after delay
                setTimeout(() => {
                    if (confirm('Registration complete! Would you like to register another student?')) {
                        form.reset();
                        payButton.disabled = false;
                        payButton.innerHTML = 'Proceed to Payment';
                        paymentStatus.style.display = 'none';
                    }
                }, 3000);
            } else {
                throw new Error(data.message || 'Failed to save registration');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            payButton.disabled = false;
            payButton.innerHTML = 'Proceed to Payment';
            showStatus(
                `Payment successful but registration could not be saved. 
                Please contact support with Payment ID: ${formData.paymentId}`, 
                'error'
            );
        });
    }
    
    function handlePaymentFailure(response) {
        payButton.disabled = false;
        payButton.innerHTML = 'Proceed to Payment';
        
        const errorMessage = response.error ? 
            `Payment failed: ${response.error.description}` : 
            'Payment failed. Please try again.';
        
        showStatus(errorMessage, 'error');
    }
    
    function showStatus(message, type) {
        paymentStatus.textContent = message;
        paymentStatus.className = `payment-status ${type}`;
        paymentStatus.style.display = 'block';
        
        // Scroll to status
        paymentStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Auto-format phone numbers
    document.getElementById('phone').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    
    document.getElementById('parentPhone').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
});