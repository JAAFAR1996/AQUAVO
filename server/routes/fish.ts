import { Router } from "express";
import type { IStorage } from "../storage/index.js";
import { freshwaterFish } from "../../shared/initial-fish-data.js";

export function createFishRouter(storage: IStorage) {
  const router = Router();

  /**
   * GET /api/fish
   * Get all fish species with fallback to static data
   */
  router.get("/", async (_req, res, next) => {
    try {
      // Try to get from database first
      let fish = await storage.getAllFishSpecies();

      // If database is empty, use fallback data
      if (!fish || fish.length === 0) {
        console.warn("⚠️ Database empty, using fallback fish data");
        fish = freshwaterFish as any[];
      }

      console.log(`✅ Fetched ${fish.length} fish species`);
      res.json(fish);
    } catch (err) {
      console.error("❌ Error fetching fish species:", err);
      // Fallback to static data if database fails
      console.log(`⚠️ Using fallback: ${freshwaterFish.length} fish species`);
      res.json(freshwaterFish);
    }
  });

  /**
   * GET /api/fish/:id
   * Get a specific fish species by ID
   */
  router.get("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      let fish = await storage.getFishSpeciesById(id);

      // Fallback to static data if not found in database
      if (!fish) {
        fish = freshwaterFish.find((f: any) => f.id === id) as any;
      }

      if (!fish) {
        return res.status(404).json({ message: "Fish species not found" });
      }

      res.json(fish);
    } catch (err) {
      console.error("Error fetching fish species:", err);
      // Final fallback
      const fish = freshwaterFish.find((f: any) => f.id === req.params.id);
      if (fish) {
        return res.json(fish);
      }
      next(err);
    }
  });

  return router;
}
