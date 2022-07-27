const express = require('express')
var cors = require('cors')
var bodyParser = require('body-parser')
const { createFile } = require('./createFile')
const { runcpp } = require('./runCpp')
const { runjava } = require('./runJava')
const { runpy } = require('./runPy')
const { runc } = require('./runC')
const { deleteFile } = require('./deleteFile')
const mongoose = require('mongoose')
require('dotenv').config()
const { userModel } = require('./models/user')
const bcrypt = require("bcrypt");
var uniqid = require('uniqid');


mongoose.connect(process.env.mongodb).then(() => {
    console.log("connected");
}).catch(err => {
    console.log(err);
})

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));

const server = require('http').createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { cors: { origin: "*" } })

io.on('connection', (socket) => {
    console.log(`a user connected with id :${socket.id}`);
    socket.on('getcode', (code) => {
        if (code.roomid)
            socket.broadcast.emit(`sendcode${code.roomid}`, { code: code.code, lang: code.lang });
    })
    socket.on('disconnect', () => {
        console.log(`a user disconnected with id: ${socket.id}`);
    })
});

app.post('/run', async (req, res) => {
    const inDate = new Date()
    const { language, code, input } = req.body
    if (!language) return res.json({ error: 'No language mentioned' })
    if (!code) return res.json({ error: 'Empty code' })
    const fileCreatedPath = await createFile(code, language)
    const inputFile = await createFile(input, 'txt')
    if (language === 'cpp') {
        const out = await runcpp(fileCreatedPath, inputFile)
        out.push(new Date() - inDate);
        deleteFile(fileCreatedPath)
        deleteFile(inputFile)
        res.send(out);
    }
    if (language === 'java') {
        const out = await runjava(fileCreatedPath, inputFile)
        out.push(new Date() - inDate);
        deleteFile(fileCreatedPath)
        deleteFile(inputFile)
        res.send(out);
    }
    if (language === 'py') {
        const out = await runpy(fileCreatedPath, inputFile)
        out.push(new Date() - inDate);
        deleteFile(fileCreatedPath)
        deleteFile(inputFile)
        res.send(out);
    }
    if (language === 'c') {
        const out = await runc(fileCreatedPath, inputFile)
        out.push(new Date() - inDate);
        deleteFile(fileCreatedPath)
        deleteFile(inputFile)
        res.send(out);
    }
})

app.post('/auth/login', async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.body.email })
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (validPassword)
            res.status(200).send(await userModel.findOne({ email: req.body.email }, { password: 0 }))
        else res.status(400).send({ message: "wrong password" });
    } catch (err) {
        if (err) {
            res.status(400).send("User doesn't exist")
        }
    }
})

app.post('/auth/signup', async(req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const createuser = new userModel({
            uid: uniqid(),
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, salt)
        })
        await createuser.save();
        res.status(200).send(await userModel.findOne({ email: req.body.email }, { password: 0,email:0,_id:0 }))
    }
    catch (err) {
        res.status(400).send(err)
    }
})

app.post('/savecode', (req, res) => {
    //body has code + uid + filename +time
})

server.listen(process.env.PORT || 8000, () => {
    console.log("listening on port 8000");
})
