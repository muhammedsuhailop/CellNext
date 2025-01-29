const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const methodOverride = require('method-override');
const env = require('dotenv').config();
const db = require('./config/db')
const userRouter = require('./routes/userRoute');
const adminRouter = require('./routes/adminRoute');
const { Session } = require('inspector/promises');
const noCache = require('./middlewares/noCache');
const morgan = require('morgan');
db();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(noCache);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}))
app.use(flash());

// app.use(morgan('dev'));

app.use(passport.initialize());
app.use(passport.session());


app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.locals.currentPath = req.url;
    next();
});
app.use((req, res, next) => {
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});


app.use('/', userRouter);
app.use('/admin', adminRouter);


app.listen(process.env.PORT, () => {
    console.log(`Server running at ${process.env.PORT}`);
})