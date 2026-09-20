require("dotenv").config();
const { initFirebase } = require("./firebase");

async function testFirestore() {
  const db = initFirebase();

  const docRef = await db.collection("testCollection").add({
    message: "Hello from TrustTracer!",
    createdAt: new Date().toISOString(),
  });

  console.log("Document written with ID:", docRef.id);
}

testFirestore();