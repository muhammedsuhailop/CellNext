const loadHomePage = async (req, res) => {
    try {
        return res.render('home');
    } catch (error) {
        console.log('Error loading Home page');
        res.status(500).send('Server Error');
    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
        res.redirect('./pageNotFound');
    }
}

const loadSignupPage = async (req, res) => {
    try {
        res.render('signup')
    } catch (error) {
        console.log('Error loading Signup page');
        res.status(500).send('Server Error');
    }
}

const loadLoginPage = async (req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.log('Error loading Login page');
        res.status(500).send('Server Error');
    }
}

const loadSignupOtpPage = async (req, res) => {
    try {
        res.render('signup-with-otp');
    } catch (error) {
        console.log('Error loading Signup with OTP page');
        res.status(500).send('Server Error');
    }
}


module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignupPage,
    loadLoginPage,
    loadSignupOtpPage,

}