const AWS = require("aws-sdk");

module.exports = () => {
    console.info("Initializing environment.");
    process.env.AWS_REGION = "eu-west-1";
};

