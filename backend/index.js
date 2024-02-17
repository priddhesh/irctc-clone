require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
// const pool = require("./connect");
const { response } = require("express");
const schedule = require('node-schedule');
const {register,authenticate, authenticateAdmin, changePassword, getMaxRouteID, addTrain, addRoute, allTrains,deleteTrain, routeInfo, getStStation, getEndStation,getTrain, searchTrain, seats, BookTicket, getTrainID, addPassenger, updateSeats, getTickets, getStationDetails, deleteTicket, getAllBookings } = require('./database');

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DB,
  }).promise();
  

const weekday={
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

function getNextDay(date = new Date(), day) {
    const dateCopy = new Date(date.getTime());
  
    const next = new Date(
      dateCopy.setDate(
        dateCopy.getDate() + ((7 - dateCopy.getDay() + day) % 7 || 7),
      ),
    );
  
    return next;
  }


const pricePerMinute=2;
function getTime(dh, dm){
    let time="";
    if(dh<10){
        time = time + "0" + String(dh)+":";
    }
    else{
        time = time + String(dh)+":";
    }
    if(dm<10){
        time = time + "0" + String(dm)+":00";
    }
    else{
        time = time + String(dm)+":00";
    }
    return time;
}

app.post("/register", async(req, res) =>{
    try {
        req=req.body;
        const newUser = await register(req.fname.toLowerCase(), req.lname.toLowerCase(), req.email, req.contactNo, req.Password);
        res.json({created: true});
    } catch (err) {
        res.json({created: false});
    }
});

app.post("/login", async(req, res) =>{
    try {
        let email = req.body.email;
      let password = req.body.Password;

      let User = await authenticate(email,password);
      if(User.length===1){
        let obj={success: true,
            userId: User[0].UserID
        }
        res.json(obj);
      }else{
        res.json({success: false});
      }
    } catch (err) {
        res.json({success: false});
    }
});

app.post("/adminLogin", async(req, res) =>{
    try {
      let email = req.body.email;
      let password = req.body.Password;

      let Admin = await authenticateAdmin(email,password);
      if(Admin.length===1){
        let obj={success: true,
            userId: Admin[0].AdminID
        }
        res.json(obj);
      }else{
        res.json({success: false});
      }
    } catch (err) {
        res.json({success: false});
    }
    // try {
    //     req=req.body;
    //     console.log(req);   
    //     let User = await pool.query(
    //         "SELECT * FROM ADMINS WHERE ADMINEMAIL=$1",
    //         [req.email]
    //     );
    //     User=User.rows[0];
    //     if(User.length == 0){
    //         res.json({success: false});
    //     }
    //     else{
    //         if(User.password == req.Password){
    //             let obj={success: true,
    //                 adminId: User.adminid
    //             }
    //             res.json(obj);
    //         }
    //         else{
    //             res.json({success: false});
    //         }
    //     }
    // } catch (err) {
    //     res.json({success: false});
    // }
});

app.post("/allTrains", async(req, res) =>{
    try {
        req=req.body;
        //console.log(req);   
        let [allTrainsData] = await allTrains();
        res.json(allTrainsData);
    } catch (err) {
        res.json({success: false});
    }
});


app.post("/allBookings", async(req, res) =>{
    try {
        let allBookingsData = await getAllBookings();
        allBookingsData = allBookingsData[0]; 
        res.json(allBookingsData);
    } catch (err) {
        res.json({success: false});
    }
});


app.post("/changePasswords", async(req, res) =>{
    try {
        req=req.body;
        let data = await changePassword(req.userId,req.oldPassword,req.newPassword);
        if(data.affectedRows === 0){
            res.json({success: false});
        }else{
            res.json({success: true});
        }
        // let User = await pool.query(
        //     "SELECT Password FROM USERS WHERE USERID=$1",
        //     [req.userId]
        // );
        // User=User.rows[0];
        // console.log(User);
        // if(User.length == 0){
        //     res.json({success: false});
        // }
        // else{
        //     if(User.password == req.oldPassword){
        //         let change = await pool.query(
        //             "UPDATE USERS SET PASSWORD = $1 WHERE USERID = $2",
        //             [req.newPassword, req.userId]
        //         );
        //         res.json({success: true});
        //     }
        //     else{
        //         res.json({success: false});
        //     }
        // }
    } catch (err) {
        console.log(err);
        res.json({success: false});
    }
});



app.post("/getTrains", async(req, res) =>{
    let trainDetails = [];
    try {
        req=req.body;
        let trains = await searchTrain(req.departure.toLowerCase(),req.arrival.toLowerCase(),req.date);
        trains = trains[0];
        for(let i=0;i<trains.length;i++){
            let currentTrain = await getTrain(trains[i].TRAINID);
            let remainingSeats = await seats(trains[i].TRAINID, trains[i].ROUTEID, trains[i].DEPARTURETIME, trains[i].ARRIVALTIME);
            remainingSeats = remainingSeats[0]['Seats'];
            currentTrain=currentTrain[0][i];
            let h=parseInt((currentTrain.StartTime).slice(0, 3)), m=parseInt((currentTrain.StartTime).slice(3,5));
            let dh=(h+Math.floor(trains[i].DEPARTURETIME/60))%24, dm=(m+trains[i].DEPARTURETIME%60)%60;
            dh+=Math.floor((m+trains[i].DEPARTURETIME%60)/60);
            let departureTime = getTime(dh, dm);
            //console.log(departureTime);
            dh=(h+Math.floor(trains[i].ARRIVALTIME/60))%24;
            dm=(m+trains[i].ARRIVALTIME%60)%60;
            let arrivalTime = getTime(dh, dm);
            trainDetails.push({
                trainid: parseInt(trains[i].TRAINID),
                departure: trains[i].DEPT,
                arrival: trains[i].ARR,
                departureDate: trains[i].DEPARTURETIME,
                arrivalDate: trains[i].ARRIVALTIME,
                durationHours: Math.floor(trains[i].DURATION/60),
                durationMinutes: trains[i].DURATION%60,
                price: trains[i].DURATION*pricePerMinute,
                trainName: currentTrain.TrainName,
                runsOn: currentTrain.RunsOn,
                remainingSeats: remainingSeats,
                arrivalTime: arrivalTime,
                departureTime: departureTime,
                routeId: parseInt(trains[i].ROUTEID)
            })
        }
        res.json(trainDetails);
    } catch (err) {
        res.json(trainDetails);
    }

});


app.post("/getRoute", async(req, res) =>{
    let details = {
        flag : false
    };
    try {
        req=req.body;
        req.tID=parseInt(req.tID);
        let route = await routeInfo(req.tID);
        route = route[0];
        let startSt = await getStStation(req.tID);
        startSt=startSt[0][0]['CURRENTSTATION'];
        let endSt = await getEndStation(req.tID);
        endSt=endSt[0][0]['CURRENTSTATION'];
        let train = await getTrain(req.tID);
        train=train[0][0];
        details = {
            trainId: req.tID,
            trainName: train.TrainName,
            startStation: startSt,
            destinationStation: endSt,
            runsOn: train.RunsOn,
            stations: [],
            flag: true
        }
        let h=parseInt((train.StartTime).slice(0, 3)), m=parseInt((train.StartTime).slice(3,5));
        for(let i=0;i<route.length;i++){
            let dh=(h+Math.floor(route[i].TIMEFROMSTART/60))%24, dm=(m+route[i].TIMEFROMSTART%60)%60;
            dh+=Math.floor((m+route[i].TIMEFROMSTART%60)/60);
            let arrivalTime = getTime(dh, dm);
            m+=10;
            dh=(h+Math.floor(route[i].TIMEFROMSTART/60))%24
            dm=(m+route[i].TIMEFROMSTART%60)%60;
            dh+=Math.floor((m+route[i].TIMEFROMSTART%60)/60);
            let departureTime = getTime(dh, dm);

            details.stations.push({
                stationName: route[i].CURRENTSTATION,
                arrivalTime: arrivalTime,
                departureTime: departureTime
            })
        }
        res.json(details);
    } catch (err) {
        console.log(err);
        res.json(details);
    }
});


app.post("/deleteTrain", async(req, res) =>{
    try { 
        const deletedTrain = await deleteTrain(req.body.trainId);
        if(deletedTrain[0].affectedRows ===0){
            res.json({success: false});
        }else{
            res.json({success: true});
        }
    } catch (err) {
        res.json({created: false});
    }
});

app.post("/deleteTicket", async(req, res) =>{
    try { 
        const data = await deleteTicket(req.body.ticketId); 
        if(data[0].affectedRows){
           res.json({created: true});
        }else{
            res.json({created: false}); 
        }
    } catch (err) {
        res.json({created: false});
    }
});

app.post("/getBookings", async(req, res) =>{
    req=req.body;
    let obj = [];
    try {  
        let tickets = await getTickets(req.id); 
        tickets = tickets[0];
        for(let i=0;i<tickets.length;i++){
            let train = await getTrain(tickets[i].TrainID); 
            train = train[0];
            let stationDetails = await getStationDetails(tickets[i].SourceStation, tickets[i].DestinationStation, tickets[i].RouteID);
            stationDetails = stationDetails[0];
            let h=parseInt((train[0].StartTime).slice(0, 3)), m=parseInt((train[0].StartTime).slice(3,5));
            let dh=(h+Math.floor(stationDetails[0].DEPARTURETIME/60))%24, dm=(m+stationDetails[0].DEPARTURETIME%60)%60;
            dh+=Math.floor((m+stationDetails[0].DEPARTURETIME%60)/60);
            let departureTime = getTime(dh, dm);
            dh=(h+Math.floor(stationDetails[0].ARRIVALTIME/60))%24;
            dm=(m+stationDetails[0].ARRIVALTIME%60)%60;
            let arrivalTime = getTime(dh, dm);
            obj.push({
                trainName: train[0].TrainName,
                trainId: tickets[i].TrainID,
                noOfPassengers: tickets[i].NoOfPassenger,
                departureStation: tickets[i].SourceStation,
                departureTime: departureTime,
                departureDate: stationDetails[0].DEPARTURETIME,
                durationHours: Math.floor(stationDetails[0].DURATION/60),
                durationMinutes: stationDetails[0].DURATION%60,
                runsOn: train[0].RunsOn,
                arrivalStation: tickets[i].DestinationStation,
                arrivalTime: arrivalTime,
                arrivalDate: stationDetails[0].ARRIVALTIME,
                ticketId: tickets[i].TicketID
            })
        }
        res.json(obj);
    } catch (err) {
        res.json(obj);
    }
});

app.post("/bookTicket", async(req, res) =>{
    try {
        req=req.body;  
        const newTicket = await BookTicket(req.userId,req.routeId,req.trainId,req.sourceStation,req.destinationStation,req.price,req.email,req.contactno,req.passengers.length);
        let ticketId= await getTrainID();
        ticketId = parseInt(ticketId[0].ticketID);
        for(let i=0;i<req.passengers.length;i++){
            const newPassenger = await addPassenger(ticketId,req.passengers[i].name.toLowerCase(), req.passengers[i].age, req.passengers[i].gender);
        }
        
        const updateRemainingSeats = await updateSeats(req.passengers.length,req.sourceStation,req.destinationStation,req.routeId,req.trainId);
        res.json({created: true});

    } catch (err) {
        res.json({created: false});
        console.log(err);
    }
});


app.post("/addTrain", async(req, res) =>{
    req=req.body;
    let d1=getNextDay(new Date(), weekday[req.runson]), d2=getNextDay(d1, weekday[req.runson]);
    try {
        let maxRouteId = await getMaxRouteID();
        maxRouteId = maxRouteId[0]['MAX(RouteID)'];
        let newTrain = await addTrain(req.trainName.toLowerCase(), req.runson.toLowerCase(), req.totalseats, req.starttime);
        newTrain = newTrain[0]['MAX(TrainID)'];
        // let newTrain = await pool.query(
        //     "INSERT INTO Trains (TrainName, RunsOn, TotalSeats, StartTime) VALUES($1, $2, $3, $4) returning TrainID;",
        //     [req.trainName.toLowerCase(), req.runson.toLowerCase(), req.totalseats, req.starttime]
        // );
    //     newTrain=newTrain.rows[0];
        for(let i=0;i<req.routes.length;i++){
            const newRoute = await addRoute(newTrain, req.routes[i].station.toLowerCase(), req.totalseats, req.routes[i].timeFromStart, d1, maxRouteId===null?0:maxRouteId+1);
            // const newRoute = await pool.query("INSERT INTO Routes (TrainID, CurrentStation, RemainingSeats, TimefromStart, CurrentDate, RouteID) VALUES($1, $2, $3, $4, $5, $6);",
            //     [newTrain.trainid, req.routes[i].station.toLowerCase(), req.totalseats, req.routes[i].timeFromStart, d1, maxRouteId===null?0:maxRouteId+1]
            // );
        }
        for(let i=0;i<req.routes.length;i++){
            const newRoute = await addRoute(newTrain, req.routes[i].station.toLowerCase(), req.totalseats, req.routes[i].timeFromStart, d2, maxRouteId===null?0:maxRouteId+2);
            // const newRoute = await pool.query("INSERT INTO Routes (TrainID, CurrentStation, RemainingSeats, TimefromStart, CurrentDate, RouteID) VALUES($1, $2, $3, $4, $5, $6);",
            //     [newTrain.trainid, req.routes[i].station.toLowerCase(), req.totalseats, req.routes[i].timeFromStart, d1, maxRouteId===null?0:maxRouteId+1]
            // );
        }
        res.json({success: true});
    }catch(err){
        console.log(err);
    }

});

app.listen(5050, () => {
    console.log("server has started on port 5050");
});