// Razorpay Key - will be fetched from server
let RAZORPAY_KEY_ID = null;

// API endpoints
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : '';
const API_ENDPOINT = `${API_BASE}/api/register`;
const CONFIG_ENDPOINT = `${API_BASE}/api/config`;
const ORDER_ENDPOINT = `${API_BASE}/api/create-order`;

// Fetch Razorpay configuration
async function fetchConfig() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        const config = await response.json();
        RAZORPAY_KEY_ID = config.razorpayKeyId;
    } catch (error) {
        console.error('Failed to fetch configuration:', error);
    }
}

// Initialize form
document.addEventListener('DOMContentLoaded', async function() {
    // Fetch configuration first
    await fetchConfig();
    const form = document.getElementById('registrationForm');
    const payButton = document.getElementById('payButton');
    const paymentStatus = document.getElementById('paymentStatus');
    
    // Payment button click handler
    payButton.addEventListener('click', function(e) {
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
    
    async function initiatePayment() {
        const formData = getFormData();
        
        // Disable button
        payButton.disabled = true;
        payButton.innerHTML = '<span class="loading"></span> Creating order...';
        
        let orderData;
        
        try {
            // Create order first
            const orderResponse = await fetch(ORDER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            orderData = await orderResponse.json();
            
            if (!orderData.success) {
                throw new Error(orderData.message || 'Failed to create order');
            }
            
            payButton.innerHTML = '<span class="loading"></span> Processing payment...';
            
        } catch (error) {
            console.error('Error creating order:', error);
            payButton.disabled = false;
            payButton.innerHTML = 'Proceed to Payment';
            showStatus('Failed to create order. Please try again.', 'error');
            return;
        }
        
        // Check if Razorpay is loaded
        if (typeof Razorpay === 'undefined') {
            payButton.disabled = false;
            payButton.innerHTML = 'Proceed to Payment';
            showStatus('Payment gateway not loaded. Please refresh the page and try again.', 'error');
            return;
        }
        
        // Razorpay options with order ID
        const options = {
            key: RAZORPAY_KEY_ID,
            order_id: orderData.orderId, // Use order ID from server
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Aakansh Physics Academy',
            description: 'Class 12 Physics Mock Test Registration',
            image: window.location.origin + '/logo.png', // Logo with full URL
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
                // Payment successful - response will include order_id, payment_id, and signature
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
        formData.orderId = response.razorpay_order_id;
        formData.signature = response.razorpay_signature;
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