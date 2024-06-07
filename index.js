const express = require('express')
const app = express()

const crypto = require('crypto');
const axios = require('axios').default; // npm install axios
const CryptoJS = require('crypto-js'); // npm install crypto-js
const moment = require('moment'); // npm install moment
const qs = require('qs')

app.use(express.json());
app.use(express.urlencoded({extended:true}))

var accessKey = 'F8BBA842ECF85';
var secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';  
var partnerCode = 'MOMO';

const config = {
    app_id: "2553",
    key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
    key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create"
};

app.get("/",(req,res) =>{
    res.send("<h1>Hello</h1>")
})
// API THANH TOAN ZALOPAY
app.post("/payment",async(req,res) =>{
    const price = req.body.price;
    const content = req.body.content;
    const embed_data = {};

    const items = [{}];
    const transID = Math.floor(Math.random() * 1000000);
    const order = {
        app_id: config.app_id,
        app_trans_id: `${moment().format('YYMMDD')}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
        app_user: "user123",
        app_time: Date.now(), // miliseconds
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: price,
        description: `Discord - Thanh toán ${content} Đơn hàng #${transID}`,
        bank_code: "",
        callback_url:'https://server-api-payment-zalo.vercel.app/callback'
    };

    // appid|app_trans_id|appuser|amount|apptime|embeddata|item
    const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    try {   
        const result = await axios.post(config.endpoint, null, { params: order })  
        console.log(result.data)
        return res.status(200).json(result.data)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Something went wrong' });
    }   
})

app.post('/callback', (req, res) => {
    let result = {};

    try {
        let dataStr = req.body.data;
        let reqMac = req.body.mac;

        let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
        console.log("mac =", mac);


        // kiểm tra callback hợp lệ (đến từ ZaloPay server)
        if (reqMac !== mac) {
        // callback không hợp lệ
            result.return_code = -1;
            result.return_message = "mac not equal";
        }
        else {
        // thanh toán thành công
        // merchant cập nhật trạng thái cho đơn hàng
            let dataJson = JSON.parse(dataStr, config.key2);
            console.log("update order's status = success where app_trans_id =", dataJson["app_trans_id"]);

            result.return_code = 1;
            result.return_message = "success";
        }
    } catch (ex) {
        result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
        result.return_message = ex.message;
    }

    // thông báo kết quả cho ZaloPay server
    res.json(result);
});

app.post('/order-status/:app_trans_id',async(req,res) =>{
    const app_trans_id= req.params.app_trans_id;
    let postData = {
        app_id: config.app_id,
        app_trans_id: app_trans_id, // Input your app_trans_id
    }

    let data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1; // appid|app_trans_id|key1
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();


    let postConfig = {
        method: 'post',
        url: 'https://sb-openapi.zalopay.vn/v2/query',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: qs.stringify(postData)
    };

    try {      
        const result = await axios(postConfig);
        return res.status(200).json(result.data);
    } catch (error) {
        
    }
        
})

// API THANH TOAN MOMO
app.post("/payment-momo",async(req,res)=>{
    const price = req.body.price;
    const content = req.body.content;

    var orderInfo = content;
    var redirectUrl = 'https://momo.vn/';
    var ipnUrl = 'https://server-api-payment-zalo.vercel.app/callback-momo';
    var requestType = "payWithMethod";
    var amount = price;
    var orderId = partnerCode + new Date().getTime();
    var requestId = orderId;
    var extraData ='';
    var orderGroupId ='';
    var autoCapture =true;
    var lang = 'vi';

    //before sign HMAC SHA256 with format
    //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    var rawSignature = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=" + extraData + "&ipnUrl=" + ipnUrl + "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode + "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=" + requestType;
    //puts raw signature
    console.log("--------------------RAW SIGNATURE----------------")
    console.log(rawSignature)
    //signature
    
    var signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    console.log("--------------------SIGNATURE----------------")
    console.log(signature)

    //json object send to MoMo endpoint
    const requestBody = JSON.stringify({
        partnerCode : partnerCode,
        partnerName : "Test",
        storeId : "MomoTestStore",
        requestId : requestId,
        amount : amount,
        orderId : orderId,
        orderInfo : orderInfo,
        redirectUrl : redirectUrl,
        ipnUrl : ipnUrl,
        lang : lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData : extraData,
        orderGroupId: orderGroupId,
        signature : signature
    });
    // option for axios
    const option = {
        method:'POST',
        url:'https://test-payment.momo.vn/v2/gateway/api/create',
        headers:{
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        },
        data: requestBody
    }

    let result;
    try {
        result = await axios(option)
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({
            statusCode:500,
            message:'Lỗi server'
        });
    }
})
app.post("/callback-momo",async(req,res) =>{
    console.log(req.body)
    return res.status(200).json(req.body)
})

app.post("/transaction-status-momo",async(req,res)=>{
    const {orderId} = req.body;

    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${orderId}`;

    const signature = crypto
                    .createHmac("sha256",secretKey)
                    .update(rawSignature)
                    .digest('hex');

    const requestBody = JSON.stringify({
        partnerCode:'MOMO',
        requestId : orderId,
        orderId:orderId,
        signature:signature,
        lang:'vi'
    })

    const options = {
        method:'POST',
        url:'https://test-payment.momo.vn/v2/gateway/api/query',
        headers:{
            'Content-Type': 'application/json',
        },
        data: requestBody
    }
    let result;
    try {
        result = await axios(options)
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({
            statusCode:500,
            message:'Lỗi server'
        });
    }
})

app.listen(3000,() =>{
    console.log('Listening App http://localhost:3000/')
})
module.exports = app;