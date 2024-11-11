import User from "./models/User.js";
import mongoose from "mongoose";

await mongoose.connect("mongodb://127.0.0.1:27017/myDB");

try {
  const data = await User.create({
    email: "hugo@gmail.com",
    username: "kat",
    age: 0
  });
  console.log(data);
} catch (error) {
  console.error(error.message)
}