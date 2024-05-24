const AWS = require('aws-sdk');
AWS.config.update({
    region: 'eu-north-1' //the server ur aws is on
});
const util = require('../utils/util');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const userTable = 'myDatabase'; //your database name goes here


async function register(userInfo) {
    console.log("Received userInfo:", userInfo);

    const name = userInfo.name;
    const email = userInfo.email;
    const username = userInfo.username;
    const password = userInfo.password;
    const birthdate = userInfo.birthdate;


    if (!username || !name || !email || !password || !birthdate) {
        return util.buildResponse(401, {
            message: 'All fields are required'
        });
    }

    const dynamoUser = await getUser(username);
    console.log("DynamoDB User:", dynamoUser);
    if (dynamoUser && dynamoUser.username) {
        return util.buildResponse(401, {
            message: 'Username already exists :( choose another one please.'
        });
    }

    if (!validator.isEmail(email)) {
        return util.buildResponse(401, {
            message: 'Invalid email address'
        });
    }


    const today = new Date();
    const birthDateObj = new Date(birthdate);
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    if (age < 18) {
        return util.buildResponse(401, {
            message: 'You must be at least 18 years old to register'
        });
    }


    const encryptedPW = bcrypt.hashSync(password.trim(), 10);
    const user = {
        name: name,
        email: email.trim(),
        username: username.toLowerCase().trim(),
        password: encryptedPW,
        birthdate: birthdate,
    };

    console.log("User object before saving:", user);

    const saveUserResponse = await saveUser(user);
    console.log("Save User Response:", saveUserResponse);
    if (!saveUserResponse) {
        return util.buildResponse(503, {
            message: 'Server Error :(((, please try again later'
        });
    }

    return util.buildResponse(200, { username: username });
}

async function getUser(username) {
    const params = {
        TableName: userTable,
        Key: {
            username: username
        }
    };
    return await dynamodb.get(params).promise().then(response => {
        return response.Item;
    }, error => {
        console.error('There is an error getting the user:(( Error:)):', error);
    });
}

async function saveUser(user) {
    user.points = 0;
    const params = {
        TableName: userTable,
        Item: user
    };
    return await dynamodb.put(params).promise().then(() => {
        return true;
    }, error => {
        console.error('There is an error saving the user:( Error:', error);
    });
}

module.exports.register = register;
