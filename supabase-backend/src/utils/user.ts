const jwt = require('jsonwebtoken');
const axios = require('axios');

function getUserIdFromJWT(token: any) {
    try {
        const secret = process.env.JWT_SECRET; // or wherever your secret is stored
        const decoded = jwt.verify(token, secret);
        return decoded.userId; // assuming your JWT payload has userId
    } catch (err) {
        console.error('Invalid JWT:', err);
        return null;
    }
}


async function fetchData(userId : any) {
    try {
        const api_endpoint = process.env.ENDPOINT || "http://localhost:3000"
        const categoriesRes = await axios.get(`${api_endpoint}/categories?userId=${userId}`);
        const emailsRes = await axios.get(`${api_endpoint}/emails?userId=${userId}`);
        return {
            categories: categoriesRes.data,
            emails: emailsRes.data
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        return null;
    }
}

export default getUserIdFromJWT;
