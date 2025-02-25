#  CellNext - E-Commerce Platform

CellNext is a full-stack mobile e-commerce platform built using MongoDB, Express, EJS, and Node.js. It allows users to browse, search, and purchase electronic gadgets while providing an admin panel for product management.

---

#  Tech Stack

Frontend: EJS, Bootstrap, JavaScript

Backend: Node.js, Express.js

Database: MongoDB

Deployment: Nginx, PM2, AWS

---

#  Installation & Setup

--Clone the repository
git clone https://github.com/muhammedsuhailop/CellNext.git
cd CellNext

--Install Dependencies
npm install

--Configure Environment Variables
PORT,
NODEMAILER_PASSWORD,
NODEMAILER_EMAIL,
GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET,
RAZORPAY_KEY,
RAZORPAY_SECRET,
MONGODB_URI_ATLAS,
CLOUDINARY_CLOUD_NAME,
CLOUDINARY_API_KEY, 
CLOUDINARY_API_SECRET,
GOOGLE_CALLBACK_LOCAL,
GOOGLE_CALLBACK_PROD,

--Start the Application
npm start

--Use PM2 for Process Management
pm2 start app.js --name "cellnext"

---




