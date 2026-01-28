// Week 2 S3 Static Site - Basic JavaScript
// Students: Enhance this with your LLM assistant!

// Set current date
document.addEventListener('DOMContentLoaded', function() {
    // Display current date
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Try to detect bucket name from URL (if hosted on S3)
    const bucketElement = document.getElementById('bucket-name');
    if (bucketElement) {
        const hostname = window.location.hostname;
        
        // S3 website endpoint patterns:
        // bucket-name.s3-website-region.amazonaws.com
        // bucket-name.s3-website.region.amazonaws.com
        if (hostname.includes('s3-website')) {
            const bucketName = hostname.split('.')[0];
            bucketElement.textContent = bucketName;
        } else if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
            bucketElement.textContent = 'Testing locally';
        } else {
            bucketElement.textContent = 'Custom domain or CloudFront';
        }
    }

    // Add a simple console message for students
    console.log('🚀 Week 2 S3 Static Site loaded successfully!');
    console.log('💡 Tip: Use your browser DevTools to inspect this site');
    console.log('🤖 Challenge: Use an LLM to add more interactive features!');
});

// Example function students can enhance
function greetUser() {
    const name = document.getElementById('student-name').textContent;
    if (name === '[Your Name Here]') {
        console.log('👋 Welcome! Update your name in the HTML to personalize this site.');
    } else {
        console.log(`👋 Hello, ${name}! Your site is live on S3.`);
    }
}

// Call greeting function
greetUser();

// LLM Enhancement Ideas (commented out - students can implement):
// 
// 1. Add a dark mode toggle:
//    - Create a button to switch between light/dark themes
//    - Store preference in localStorage
//    - Update CSS variables dynamically
//
// 2. Add form validation:
//    - Create a contact form
//    - Validate email format
//    - Show success/error messages
//
// 3. Add animations:
//    - Animate sections on scroll (Intersection Observer API)
//    - Add smooth transitions
//    - Create loading animations
//
// 4. Add interactive charts:
//    - Use Chart.js or D3.js
//    - Visualize some data (e.g., AWS service usage)
//    - Make it responsive
//
// 5. Add a simple game or quiz:
//    - Test knowledge of AWS S3 concepts
//    - Track score in localStorage
//    - Show results with animations

