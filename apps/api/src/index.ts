import express from "express";
import cors from "cors";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API listening on ${port}`));
