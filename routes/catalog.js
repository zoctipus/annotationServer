//catalog.js
const express = require("express")
const router = express.Router();
const asyncHandler = require("express-async-handler")
const path = require('path');
const db = require('../sql/db')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const saveAnnotation = require('../controllers/annotationSaveController')


router.get("/", asyncHandler(async (req, res, next) => {
    res.send("hello server")
}))

router.get("/model", asyncHandler(async (req, res, next) => {
    res.send("hello model")
}))

router.get("/model/:id", asyncHandler(async (req, res, next) => {
    const modelName = `${req.params.id}.glb`
    const modelFile = path.join(__dirname, '../storage/fixed/', modelName);
    console.log(modelFile)
    res.sendFile(modelFile, function (err) {
        if (err) {
            // Handle error, but make sure the response is sent,
            // otherwise the client will be left hanging
            console.log(err);
            res.status(err.status).end();
        } else {
            console.log('Sent:', modelFile);
        }
    })
}))

router.get("/getNextModelUrl/:currentModelId?", asyncHandler(async (req, res, next) => { 
    const currentModelId = req.params.currentModelId;
    let query;
    let queryParams;
  
    if (currentModelId) {
        query = `
            SELECT modelID, modelUrl FROM Model 
            WHERE modelID NOT IN (SELECT modelID FROM Annotation)
            AND modelID != ?
            LIMIT 1
        `;
        queryParams = [currentModelId];
    } else {
        query = `
            SELECT modelID, modelUrl FROM Model 
            WHERE modelID NOT IN (SELECT modelID FROM Annotation)
            LIMIT 1
        `;
        queryParams = [];
    }
  
    const [rows, fields] = await db.promise().execute(query, queryParams);
  
    if (rows.length > 0) {
        res.json({ modelUrl: rows[0].modelUrl, modelID: rows[0].modelID });
    } else {
        res.json({ noMoreModels: true });
    }
}));



// If the model ID is not provided, the server returns an error status 400 with a message "Model ID needs to be specified". 
// It queries the Model table in the database for the model with the given ID. 
// If a model is found, it responds with a JSON object containing the model's URL and ID.
// If no model is found, it responds with an error message "No model found for this ID".
router.get("/getModelUrl/:ModelId?", asyncHandler(async (req, res, next) => { 
    const ModelId = req.params.ModelId;
    let query;
    let queryParams;
  
    if (ModelId) {
        query = `
            SELECT modelID, modelUrl FROM Model 
            WHERE modelID = ?
        `;
        queryParams = [ModelId];
    } else {
        return res.status(400).json({ error: 'Model ID needs to be specified' });
    }
  
    const [rows, fields] = await db.promise().execute(query, queryParams);
  
    if (rows.length > 0) {
        res.json({ modelUrl: rows[0].modelUrl, modelID: rows[0].modelID });
    } else {
        res.json({ error: 'No model found for this ID' });
    }
}));


router.post("/signup", asyncHandler(async (req, res, next) => {
    const { realName, username, password, email } = req.body;
    console.log(realName, username, password, email)
    // check if user already exists
    try{
        const [users] = await db.promise().execute(`
        SELECT * FROM User WHERE userID = ?
        `, [username]);
        if (users.length > 0) {
        // user already exists
        return res.status(400).json({ message: 'The username is already taken' });
        }
    } catch (error) {
        console.error('Error executing query:', error)
    }
    
  
    // hash the password
    const hashedPassword = await bcrypt.hash(password, 8);
  
    // store the new user in the database
    await db.promise().execute(`
      INSERT INTO User (userID, password, realName, email)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, realName, email]);
  
    // send a successful response
    res.status(201).json({ message: 'User registered successfully' });
  }));
  
router.post("/login", asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;
  
    // get the user from the database
    const [rows] = await db.promise().execute(`
      SELECT * FROM User WHERE userID = ?
    `, [username]);
  
    if (rows.length === 0) {
      // no user with the provided username was found
      return res.status(400).json({ message: 'Invalid login credentials' });
    }
  
    const user = rows[0];
  
    // compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
  
    if (!passwordMatch) {
      // the passwords do not match
      return res.status(400).json({ message: 'Invalid login credentials' });
    }
  
    // create a jsonwebtoken for the user
    const token = jwt.sign({ id: user.userID }, 'YOUR_SECRET_KEY', { expiresIn: '1h' });
  
    // send the token to the client
    res.json({ message: 'Login successful', token });
}));



router.post("/saveAnnotation", saveAnnotation);

router.get("/getAnnotationList/:userID", asyncHandler(async (req, res, next) => {
    const userID = req.params.userID;
    const [rows] = await db.promise().execute(`
        SELECT a.annotationID, m.modelUrl, m.modelID 
        FROM Annotation a 
        INNER JOIN Model m ON a.modelID = m.modelID 
        WHERE a.userID = ?
    `, [userID]);

    if (rows.length === 0) {
        // no annotations found for this user
        return res.status(404).json({ message: 'No annotations found for this user' });
    }

    res.json(rows);
}));





module.exports = router