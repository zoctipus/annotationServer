const db = require('../sql/db');  // Modify the path as needed
const asyncHandler = require('express-async-handler'); // or your own async handler
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require('@azure/identity');
require("dotenv").config();

const saveAnnotation = asyncHandler(async (req, res, next) => {
    try {
        const { userID, modelID, annotation } = req.body;

        let result;
        try {
            [result] = await db.promise().query(
                "INSERT INTO Annotation (userID, modelID, created_time) VALUES (?, ?, ?)",
                [userID, modelID, new Date()]
            );
        } catch(error) {
            console.error("Error in SQL query:", error);
            return res.status(500).json({ error: 'Error in SQL query.' });
        }

        const insertId = result.insertId;

        // Set up Azure Storage
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        if (!accountName) throw Error('Azure Storage accountName not found');
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            new DefaultAzureCredential()
        );

        // Get the "annotations" container
        const containerClient = blobServiceClient.getContainerClient("annotations");

        // Upload the annotation
        const blobName = `${modelID}/${insertId}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const annotationData = Buffer.from(JSON.stringify(annotation), 'utf8');
        await blockBlobClient.uploadData(annotationData);

        res.status(201).json({ annotationID: insertId });
    } catch(error) {
        console.error("Error in save annotation route:", error);
        return res.status(500).json({ error: 'Unexpected server error.' });
    }
});

module.exports = saveAnnotation;
