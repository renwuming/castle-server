import { models, model, Schema } from "mongoose";

export function getModel(options: GetModelOption) {
  const { modelName, schemaDefination, schemaOption, collection } = options;
  if (models[modelName]) {
    return models[modelName];
  }
  const schema = new Schema(schemaDefination, schemaOption);
  return model(modelName, schema, collection);
}
