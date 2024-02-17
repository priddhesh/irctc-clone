import * as React from "react";
import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import './files.css'

export default function AllTrain() {
  const [tickets, setTickets] = useState([]);

  const getAllBookings = async () => {
    try {
        const response = await fetch("http://localhost:5050/allBookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" }, 
        });
        const res = await response.json();
        console.log(res);
        setTickets(res);
      } catch (err) {
        console.log(err);
      }
}
  React.useEffect(() => {
    getAllBookings();
  }, [] );
  return (
    <div className="datagrid-containter">
        <br/>
        <h1>All Bookings</h1>
        <br/>
        <table className="table">
        <thead>
          <tr>
            <th scope="col">Ticket ID</th>
            <th scope="col">Train ID</th>
            <th scope="col">Source</th>
            <th scope="col">Destination</th>
            <th scope="col">Price</th>
            <th scope="col">Email</th>
            <th scope="col">Contact</th>
            <th scope="col">NoP</th>
          </tr>
        </thead>
        <tbody>
        {tickets.map((item, index) => (
      <tr key={index}>
        <td>
          {item.TicketID}
        </td>
        <td>{item.TrainID}</td>
        <td>{item.SourceStation}</td>
        <td>{item.DestinationStation}</td>
        <td>{item.Price}</td>
        <td>{item.Email}</td>
        <td>{item.ContactNo}</td>
        <td>{item.NoOfPassenger}</td>
      </tr>
    ))}
        </tbody>
      </table>
    </div>
  );
}
