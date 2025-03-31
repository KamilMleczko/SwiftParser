import express from "express";
import { SwiftRoutes } from "./routes/swift-routes";
import { createDatabaseService } from "./services/database-service";

async function startServer() {
    const app = express();
    const port = process.env.PORT || 8080;
    const dbService = await createDatabaseService();
    

    app.use(express.json());

    //main
    app.get("/", (req, res)=>{
        res.send("Hello World!");
    });
    
    //v1/swift-codes
    const swiftRoutes = new SwiftRoutes(dbService);
    app.use("/v1/swift-codes", swiftRoutes.getRouter());

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

    process.on('SIGINT', async () => {
        await dbService.disconnect();
        process.exit(0);
      });
}

startServer().catch(console.error);