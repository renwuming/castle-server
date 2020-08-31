import { provide } from "midway";
import { getModel } from "@utils/mongoose";

@provide()
export class GameModel {
  private schemaDefination = {
    _id: String,
    currentPlayer: Number,
    start: Boolean,
    startedAt: Date,
    end: Boolean,
    winner: Number,
    cards: Array,
    players: Array,
    roundIndex: Number,
    roundData: Object,
    roundHistory: Array,
  };

  private schemaOption = {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  };

  getModel() {
    return getModel({
      modelName: "game",
      schemaDefination: this.schemaDefination,
      schemaOption: this.schemaOption,
      collection: "game",
    });
  }
}
