import { provide } from "midway";
import { getModel } from "@/app/utils/mongoose";

@provide()
export class GameModel {
  private schemaDefination = {
    _id: String,
    ownPlayer: String,
    currentPlayer: Number,
    start: Boolean,
    startedAt: Date,
    end: Boolean,
    endedAt: Date,
    winner: Number,
    cards: Array,
    players: Array,
    roundData: Object,
    roundHistory: Array,
    onlineTimeStampMap: Object,
  };

  private schemaOption = {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  };

  getModel() {
    return getModel({
      modelName: "games",
      schemaDefination: this.schemaDefination,
      schemaOption: this.schemaOption,
      collection: "games",
    });
  }
}
