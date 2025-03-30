import express from "express";
import { SwiftCodeController } from "../controllers/swift-controller";
import { DatabaseService } from "../services/database-service";

export class SwiftRoutes {

    private dbService: DatabaseService
    private router: express.Router
    private swiftCodeController: SwiftCodeController

    constructor(dbService: DatabaseService) {
        this.router = express.Router();
        this.dbService = dbService;
        this.swiftCodeController = new SwiftCodeController(dbService);
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get("/", (req, res) => {
            res.send("Hey, it's swift functions");
        });

        this.router.get("/country/:countryISO2", (req, res) => 
            this.swiftCodeController.getSwiftCodesByCountry(req, res)
        );

        this.router.get("/test/:test_string", (req, res) => 
            this.swiftCodeController.test(req, res)
        );

        this.router.get("/:swift_code", (req, res) => 
            this.swiftCodeController.getSwiftCode(req, res)
        );

        this.router.post("/", (req, res) => 
            this.swiftCodeController.add_swift_code(req, res)
        );

        this.router.delete("/:swift_code", (req, res) => 
            this.swiftCodeController.delete_swift_code(req, res)
        );

    }

    getRouter() {
        return this.router;
    }
}


